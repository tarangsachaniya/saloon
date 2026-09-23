"use client";

import { useMemo, useState } from "react";
import { AppointmentDetailDialog } from "@/components/admin/AppointmentDetailDialog";
import { AppointmentList } from "@/components/admin/AppointmentList";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { RefreshIcon } from "@/components/admin/icons";
import { LoadError, PageHeader } from "@/components/admin/PageHeader";
import { RescheduleDialog } from "@/components/admin/RescheduleDialog";
import { ToastViewport, useToasts } from "@/components/admin/Toast";
import {
  APPOINTMENT_STATUS_META,
  Button,
  Card,
  EmptyState,
  Input,
  Loader,
  Select,
} from "@/components/ui";
import {
  getAdminAppointments,
  getAdminBarbers,
  getAdminServices,
  getSettings,
  updateAppointmentStatus,
} from "@/lib/api";
import { actionLabel } from "@/lib/admin/transitions";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import {
  APPOINTMENT_STATUSES,
  type Appointment,
  type AppointmentStatus,
  type Barber,
  type SalonSettings,
  type Service,
} from "@/lib/booking/types";
import { addDays, fromDateString, isSameDay, startOfToday, toDateString } from "@/lib/utils/time";
import { formatAdminDate } from "@/lib/admin/format";

/**
 * The diary.
 *
 * SCOPE DECISION — a filterable LIST for one day, not a day×barber grid.
 *
 * `GET /api/admin/appointments` takes a single `date` (its `from`/`to` range is
 * only consulted when `date` is absent), so a week grid would mean either N
 * requests per render or a range query whose rows then have to be bucketed
 * client-side. More importantly, a grid optimises for "find the gap at 3pm on
 * Thursday" — which is what the BOOKING wizard already does, correctly, against
 * the server's own availability engine. What the front desk needs from the
 * diary is different: the day's bookings in order, with the actions (confirm,
 * arrived, start, complete, cancel) reachable on the row. A list does that
 * better than a grid at every screen size, and it is honest about what one
 * request can actually answer. The barber filter covers "show me only Rahul's
 * day", which is the part of a grid that earns its keep.
 */

const ALL = "all";

export default function AppointmentsPage() {
  const { toasts, push, dismiss } = useToasts();

  const today = useMemo(() => startOfToday(), []);
  const [date, setDate] = useState(() => toDateString(today));
  const [barberId, setBarberId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    appointment: Appointment;
    status: AppointmentStatus;
  } | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  /*
   * Reference data (roster, catalogue, booking rules) in ONE load rather than
   * three hooks: none of it changes while the diary is open, all three are
   * needed together by the reschedule dialog, and a single `Promise.all` means
   * one spinner and one retry button instead of three.
   */
  const reference = useAdminData<{
    barbers: Barber[];
    services: Service[];
    settings: SalonSettings;
  }>(async (signal) => {
    const [barbers, services, settings] = await Promise.all([
      getAdminBarbers({ signal }),
      getAdminServices({ signal }),
      getSettings({ signal }),
    ]);
    return { barbers, services, settings };
  }, []);

  const {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
    setData,
  } = useAdminData(
    (signal) =>
      getAdminAppointments(
        {
          date,
          barberId: barberId === ALL ? undefined : barberId,
          status: status === ALL ? undefined : (status as AppointmentStatus),
        },
        { signal },
      ),
    [date, barberId, status],
  );

  const appointments = useMemo(() => data ?? [], [data]);
  const detail = appointments.find((item) => item.id === detailId) ?? null;
  const rescheduling = appointments.find((item) => item.id === rescheduleId) ?? null;

  const barberOptions = useMemo(
    () => [
      { value: ALL, label: "All barbers" },
      ...(reference.data?.barbers ?? []).map((barber) => ({
        value: barber.id,
        label: barber.isActive ? barber.name : `${barber.name} (inactive)`,
      })),
    ],
    [reference.data],
  );

  const statusOptions = useMemo(
    () => [
      { value: ALL, label: "All statuses" },
      ...APPOINTMENT_STATUSES.map((value) => ({
        value,
        label: APPOINTMENT_STATUS_META[value].label,
      })),
    ],
    [],
  );

  /** Replace one row in place so the change is visible before the re-read lands. */
  function applyLocally(updated: Appointment) {
    setData((current) =>
      current
        ? current.map((item) => (item.id === updated.id ? updated : item))
        : current,
    );
  }

  async function applyStatus(appointment: Appointment, next: AppointmentStatus) {
    setPendingId(appointment.id);
    try {
      const updated = await updateAppointmentStatus(appointment.id, next);
      applyLocally(updated);
      push(
        "success",
        `${updated.client?.name ?? "Appointment"} — ${actionLabel(next).toLowerCase()}.`,
      );
      // The row may no longer match an active status filter; only the server
      // knows what the filtered day now looks like.
      refresh();
      return true;
    } catch (cause) {
      push("danger", toErrorMessage(cause));
      return false;
    } finally {
      setPendingId(null);
    }
  }

  function handleQuickAction(appointment: Appointment, next: AppointmentStatus) {
    // Cancelling or marking a no-show is the one pair that cannot be undone
    // without re-opening the booking, so it gets a confirmation step.
    if (next === "CANCELLED" || next === "NO_SHOW") {
      setConfirmError(null);
      setConfirm({ appointment, status: next });
      return;
    }
    void applyStatus(appointment, next);
  }

  async function confirmDestructive() {
    if (!confirm) return;
    setConfirmError(null);
    setPendingId(confirm.appointment.id);
    try {
      const updated = await updateAppointmentStatus(
        confirm.appointment.id,
        confirm.status,
      );
      applyLocally(updated);
      push(
        "success",
        `${updated.client?.name ?? "Appointment"} — ${actionLabel(confirm.status).toLowerCase()}.`,
      );
      setConfirm(null);
      refresh();
    } catch (cause) {
      setConfirmError(toErrorMessage(cause));
    } finally {
      setPendingId(null);
    }
  }

  const selectedDate = fromDateString(date);
  const isToday = isSameDay(selectedDate, today);

  return (
    <>
      <PageHeader
        title="Appointments"
        description={
          <>
            {formatAdminDate(date)}
            {isToday && (
              <span className="ml-2 font-semibold text-secondary-700">Today</span>
            )}
          </>
        }
        actions={
          <Button
            variant="outline"
            onClick={refresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshIcon className="h-4 w-4" />}
          >
            Refresh
          </Button>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="diary-date"
              className="text-sm font-semibold text-primary"
            >
              Date
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label="Previous day"
                onClick={() => setDate(toDateString(addDays(selectedDate, -1)))}
              >
                ‹
              </Button>
              <Input
                id="diary-date"
                type="date"
                value={date}
                onChange={(event) => {
                  // An emptied native date input must not blank the query.
                  if (event.target.value) setDate(event.target.value);
                }}
                containerClassName="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                aria-label="Next day"
                onClick={() => setDate(toDateString(addDays(selectedDate, 1)))}
              >
                ›
              </Button>
            </div>
            {!isToday && (
              <button
                type="button"
                onClick={() => setDate(toDateString(today))}
                className="self-start rounded text-xs font-semibold text-secondary-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                Jump to today
              </button>
            )}
          </div>

          <Select
            label="Barber"
            options={barberOptions}
            value={barberId}
            onValueChange={setBarberId}
            disabled={reference.isLoading}
          />

          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onValueChange={setStatus}
          />
        </div>

        {reference.error && (
          <p role="alert" className="mt-3 text-sm font-semibold text-danger">
            Couldn&rsquo;t load barbers and services ({reference.error}).{" "}
            <button
              type="button"
              onClick={reference.refresh}
              className="underline underline-offset-2"
            >
              Try again
            </button>
          </p>
        )}
      </Card>

      {isLoading && <Loader label="Loading appointments…" />}

      {error && !data && <LoadError message={error} onRetry={refresh} />}

      {data && appointments.length === 0 && (
        <EmptyState
          title="No appointments match these filters"
          description={
            barberId !== ALL || status !== ALL
              ? "Try clearing the barber or status filter, or pick another date."
              : `Nothing is booked for ${formatAdminDate(date)}.`
          }
          action={
            (barberId !== ALL || status !== ALL) && (
              <Button
                variant="outline"
                onClick={() => {
                  setBarberId(ALL);
                  setStatus(ALL);
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      )}

      {data && appointments.length > 0 && (
        <>
          <p className="mb-3 text-sm text-slate-600">
            <span className="font-bold text-primary">{appointments.length}</span>{" "}
            {appointments.length === 1 ? "appointment" : "appointments"}
            {isRefreshing && " · refreshing…"}
          </p>
          <AppointmentList
            appointments={appointments}
            pendingId={pendingId}
            onOpen={(appointment) => setDetailId(appointment.id)}
            onAction={handleQuickAction}
          />
        </>
      )}

      {error && data && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm font-semibold text-danger"
        >
          Couldn&rsquo;t refresh: {error}
        </p>
      )}

      <AppointmentDetailDialog
        appointment={detail}
        open={detail !== null}
        onOpenChange={(open) => !open && setDetailId(null)}
        onSaved={(updated, message) => {
          applyLocally(updated);
          push("success", message);
          refresh();
        }}
        onReschedule={(appointment) => {
          setDetailId(null);
          setRescheduleId(appointment.id);
        }}
      />

      <RescheduleDialog
        appointment={rescheduling}
        open={rescheduling !== null}
        onOpenChange={(open) => !open && setRescheduleId(null)}
        barbers={reference.data?.barbers ?? []}
        services={reference.data?.services ?? []}
        maxAdvanceDays={reference.data?.settings.maximumAdvanceBookingDays ?? 30}
        onSaved={(updated) => {
          setRescheduleId(null);
          push(
            "success",
            `Moved to ${formatAdminDate(updated.appointmentDate)}.`,
          );
          // Follow the appointment to its new day, otherwise it just vanishes
          // from the filtered list and reads as data loss.
          if (updated.appointmentDate !== date) setDate(updated.appointmentDate);
          else refresh();
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(null);
            setConfirmError(null);
          }
        }}
        title={
          confirm?.status === "NO_SHOW"
            ? "Mark as a no-show?"
            : "Cancel this appointment?"
        }
        description={
          confirm
            ? `${confirm.appointment.client?.name ?? "This client"}, ${formatAdminDate(
                confirm.appointment.appointmentDate,
              )}. The slot is released immediately and can be re-booked. You can re-open the booking afterwards, but only if the slot is still free.`
            : ""
        }
        confirmLabel={confirm ? actionLabel(confirm.status) : "Confirm"}
        cancelLabel="Keep it"
        isPending={pendingId !== null && confirm !== null}
        error={confirmError}
        onConfirm={confirmDestructive}
      />

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
