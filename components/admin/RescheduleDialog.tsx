"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DatePicker,
  EmptyState,
  Loader,
  Select,
} from "@/components/ui";
import { getAdminBarberAvailability, updateAppointment } from "@/lib/api";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import type {
  Appointment,
  AvailabilityResponse,
  Barber,
  Service,
  Slot,
} from "@/lib/booking/types";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { addDays, formatDuration, formatTime12h, minutesToTimeString, startOfToday } from "@/lib/utils/time";
import { formatAdminDate } from "@/lib/admin/format";
import { FormError } from "./PageHeader";

/**
 * Move an appointment: change the service, the barber, the day, the time, or
 * any combination.
 *
 * The backend re-runs the ENTIRE availability check on this PATCH — exactly the
 * same code path as a customer booking — so a reschedule can fail for reasons
 * the admin cannot see coming ("This slot is no longer available.", "Cannot book
 * a date in the past."). Every one of those is rendered inline, in the dialog,
 * with the form still populated, so the admin can adjust and retry rather than
 * lose their work to a toast that appears behind a closing modal.
 *
 * FIXED (consolidation): `GET /api/barbers/:id/availability` now takes an
 * `excludeAppointmentId`, so the grid is fetched with THIS appointment left out
 * of the overlap check — the same exclusion the write path has always applied.
 * The old workaround (re-enable the appointment's own start client-side and
 * badge it "current") is gone: the server now reports that slot free on its
 * own, along with every other slot this appointment was wrongly blocking. A
 * 45-minute appointment at 11:00 used to grey out 10:15 through 11:45 in its
 * own reschedule dialog; now none of those are blocked by it.
 *
 * The "current" badge is kept purely as a label — it marks where the
 * appointment stands today, it no longer overrides availability.
 */

export interface RescheduleDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Admin barber roster (list shape — `services` is `{id,name}[]`). */
  barbers: Barber[];
  services: Service[];
  /** `SalonSettings.maximumAdvanceBookingDays`, for the calendar's upper bound. */
  maxAdvanceDays: number;
  onSaved: (appointment: Appointment) => void;
}

export function RescheduleDialog({
  appointment,
  open,
  onOpenChange,
  barbers,
  services,
  maxAdvanceDays,
  onSaved,
}: RescheduleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {appointment && (
          // Keyed so switching appointments without closing gives a clean form.
          <RescheduleForm
            key={appointment.id}
            appointment={appointment}
            barbers={barbers}
            services={services}
            maxAdvanceDays={maxAdvanceDays}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RescheduleForm({
  appointment,
  barbers,
  services,
  maxAdvanceDays,
  onCancel,
  onSaved,
}: {
  appointment: Appointment;
  barbers: Barber[];
  services: Service[];
  maxAdvanceDays: number;
  onCancel: () => void;
  onSaved: (appointment: Appointment) => void;
}) {
  const [serviceId, setServiceId] = useState(appointment.serviceId);
  const [barberId, setBarberId] = useState(appointment.barberId);
  const [date, setDate] = useState(appointment.appointmentDate);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const today = useMemo(() => startOfToday(), []);

  const serviceOptions = useMemo(
    () =>
      services
        // An inactive service stays selectable only if it is the one already
        // booked — otherwise the dialog would show a blank service.
        .filter((service) => service.isActive || service.id === appointment.serviceId)
        .map((service) => ({
          value: service.id,
          label: `${service.name} · ${formatDuration(service.durationMinutes)} · ${formatPrice(service.price)}${
            service.isActive ? "" : " (inactive)"
          }`,
        })),
    [services, appointment.serviceId],
  );

  const barberOptions = useMemo(
    () =>
      barbers
        .filter(
          (barber) =>
            barber.id === appointment.barberId ||
            (barber.isActive &&
              (barber.services ?? []).some((service) => service.id === serviceId)),
        )
        .map((barber) => ({
          value: barber.id,
          label: barber.isActive ? barber.name : `${barber.name} (inactive)`,
        })),
    [barbers, serviceId, appointment.barberId],
  );

  const selectedService = services.find((service) => service.id === serviceId);

  const {
    data: availability,
    error: availabilityError,
    isLoading,
    refresh,
  } = useAdminData<AvailabilityResponse | null>(
    (signal) =>
      serviceId && barberId && date
        ? getAdminBarberAvailability(
            barberId,
            // Tell the server we are MOVING this appointment, so it does not
            // count against its own availability.
            { serviceId, date, excludeAppointmentId: appointment.id },
            { signal },
          )
        : Promise.resolve(null),
    [serviceId, barberId, date, appointment.id],
  );

  /**
   * Where the appointment sits today — used only to label that slot and to
   * decide what "unchanged" means. The server already reports it as free.
   */
  const ownStart =
    barberId === appointment.barberId && date === appointment.appointmentDate
      ? minutesToTimeString(appointment.startTime)
      : null;

  const slots: Array<Slot & { isCurrent: boolean }> = useMemo(
    () =>
      (availability?.slots ?? []).map((slot) => ({
        ...slot,
        isCurrent: slot.start === ownStart,
      })),
    [availability, ownStart],
  );

  const availableCount = slots.filter((slot) => slot.available).length;

  const isUnchanged =
    serviceId === appointment.serviceId &&
    barberId === appointment.barberId &&
    date === appointment.appointmentDate &&
    (startTime === null || startTime === minutesToTimeString(appointment.startTime));

  async function save() {
    const chosen = startTime ?? ownStart;
    if (!chosen) {
      setError("Pick a new time for this appointment.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      // All four fields go together: the backend decides whether this counts as
      // a reschedule by comparing the whole tuple against what it has stored.
      const updated = await updateAppointment(appointment.id, {
        serviceId,
        barberId,
        date,
        startTime: chosen,
      });
      onSaved(updated);
    } catch (cause) {
      setError(toErrorMessage(cause));
      // The grid the admin was looking at is now demonstrably stale — a 409
      // means somebody else took the slot between render and submit.
      refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Reschedule appointment</DialogTitle>
        <DialogDescription>
          {appointment.client?.name ?? "This client"} — currently{" "}
          {formatAdminDate(appointment.appointmentDate)} at{" "}
          {formatTime12h(appointment.startTime)} with{" "}
          {appointment.barber?.name ?? "a barber"}.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Service"
            options={serviceOptions}
            value={serviceId}
            onValueChange={(next) => {
              setServiceId(next);
              setStartTime(null);
              // Changing the service can disqualify the current barber; the
              // options list rebuilds and an unqualified pick must not linger.
              const stillOffered = barbers.some(
                (barber) =>
                  barber.id === barberId &&
                  (barber.id === appointment.barberId ||
                    (barber.services ?? []).some((service) => service.id === next)),
              );
              if (!stillOffered) setBarberId("");
            }}
          />
          <Select
            label="Barber"
            placeholder="Choose a barber"
            options={barberOptions}
            value={barberId}
            onValueChange={(next) => {
              setBarberId(next);
              setStartTime(null);
            }}
          />
        </div>

        <DatePicker
          label="Date"
          formatValue={formatAdminDate}
          value={date}
          onChange={(next) => {
            setDate(next);
            setStartTime(null);
          }}
          minDate={today}
          maxDate={addDays(today, maxAdvanceDays)}
        />

        <div>
          <p className="mb-2 text-sm font-semibold text-primary">Time</p>

          {!barberId && (
            <p className="text-sm text-slate-500">
              Choose a barber to see their free times.
            </p>
          )}

          {barberId && isLoading && <Loader label="Checking availability…" />}

          {barberId && availabilityError && (
            <EmptyState
              title="Couldn't load times"
              description={availabilityError}
              className="border-danger/30 bg-red-50/40"
              action={
                <Button variant="outline" size="sm" onClick={refresh}>
                  Try again
                </Button>
              }
            />
          )}

          {barberId && !isLoading && !availabilityError && slots.length === 0 && (
            <EmptyState
              title="No times on this day"
              description="This barber isn't working, the salon is closed, or the service doesn't fit before closing. Try another date or barber."
            />
          )}

          {slots.length > 0 && (
            <>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {slots.map((slot) => {
                  const selected =
                    startTime === slot.start ||
                    (startTime === null && slot.isCurrent);

                  return (
                    <li key={slot.start}>
                      <button
                        type="button"
                        disabled={!slot.available}
                        aria-pressed={slot.available ? selected : undefined}
                        onClick={() => setStartTime(slot.start)}
                        className={cn(
                          "flex min-h-11 w-full flex-col items-center justify-center rounded-lg px-1 py-1.5",
                          "text-sm font-semibold tabular-nums transition-colors duration-150",
                          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
                          !slot.available &&
                            "cursor-not-allowed border border-dashed border-slate-200 bg-slate-50 text-slate-400 line-through",
                          slot.available &&
                            !selected &&
                            "border border-slate-300 bg-surface text-primary hover:border-secondary hover:bg-secondary-50 hover:text-secondary-700",
                          selected &&
                            "border border-primary bg-primary text-primary-foreground ring-2 ring-primary/25",
                        )}
                      >
                        {formatTime12h(slot.start)}
                        {slot.isCurrent && (
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wide",
                              selected ? "text-white/80" : "text-secondary-700",
                            )}
                          >
                            current
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-2 text-xs text-slate-500">
                {availableCount} free{" "}
                {selectedService
                  ? `for a ${formatDuration(selectedService.durationMinutes)} appointment`
                  : ""}
                . Crossed-out times are taken or inside a break. Times that never
                fit before closing are not listed.
              </p>
            </>
          )}
        </div>

        <FormError message={error} />

        {isUnchanged && !error && (
          <p className="text-sm text-slate-500">
            Nothing has changed yet — pick a different service, barber, date or
            time.
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={save}
          isLoading={isSaving}
          disabled={!barberId || isUnchanged}
        >
          Save new time
        </Button>
      </DialogFooter>
    </>
  );
}
