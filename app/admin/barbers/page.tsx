"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BarberFormDialog } from "@/components/admin/BarberFormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PlusIcon, RefreshIcon } from "@/components/admin/icons";
import { LoadError, PageHeader } from "@/components/admin/PageHeader";
import { ToastViewport, useToasts } from "@/components/admin/Toast";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Loader,
} from "@/components/ui";
import {
  deleteBarber,
  getAdminBarbers,
  getAdminServices,
  updateBarber,
} from "@/lib/api";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import type { Barber, Service } from "@/lib/booking/types";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";
import { getBarberPhotoUrl } from "@/lib/utils/barberImages";

/**
 * The roster.
 *
 * A card grid rather than a table: a barber record is a person (photo initials,
 * name, what they do) and the useful facts are unevenly sized — a list of
 * service names does not belong in a fixed table column. The editing itself all
 * happens in the dialog, which is where the real complexity (weekly hours,
 * breaks, days off) lives.
 *
 * "Deactivate" is the destructive action, not "Delete", for the same reason as
 * services: the backend refuses a hard delete for anyone with appointment
 * history, and deactivating is what retiring a barber actually means.
 */
export default function BarbersPage() {
  const { toasts, push, dismiss } = useToasts();

  const { data, error, isLoading, isRefreshing, refresh } = useAdminData(
    async (signal) => {
      const [barbers, services] = await Promise.all([
        getAdminBarbers({ signal }),
        // The form needs the catalogue for its qualification picker; loading it
        // with the roster means the dialog opens instantly.
        getAdminServices({ signal }),
      ]);
      return { barbers, services };
    },
    [],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Barber | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const barbers = useMemo(() => data?.barbers ?? [], [data]);
  const services: Service[] = useMemo(() => data?.services ?? [], [data]);
  const activeCount = barbers.filter((barber) => barber.isActive).length;

  function openCreate() {
    setEditingId(null);
    setIsFormOpen(true);
  }

  function openEdit(barber: Barber) {
    setEditingId(barber.id);
    setIsFormOpen(true);
  }

  async function deactivate() {
    if (!confirmTarget) return;
    setPendingId(confirmTarget.id);
    setConfirmError(null);
    try {
      await deleteBarber(confirmTarget.id);
      push("success", `${confirmTarget.name} deactivated.`);
      setConfirmTarget(null);
      refresh();
    } catch (cause) {
      setConfirmError(toErrorMessage(cause));
    } finally {
      setPendingId(null);
    }
  }

  async function reactivate(barber: Barber) {
    setPendingId(barber.id);
    try {
      // Only `isActive` is sent: any schedule array in the body would replace
      // that barber's whole schedule, and the list shape doesn't even have it.
      await updateBarber(barber.id, { isActive: true });
      push("success", `${barber.name} is taking bookings again.`);
      refresh();
    } catch (cause) {
      push("danger", toErrorMessage(cause));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Barbers"
        description={
          data
            ? `${activeCount} taking bookings${
                barbers.length > activeCount
                  ? `, ${barbers.length - activeCount} inactive`
                  : ""
              }`
            : "The salon's roster and schedules."
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={refresh}
              isLoading={isRefreshing}
              leftIcon={<RefreshIcon className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
              Add barber
            </Button>
          </>
        }
      />

      {isLoading && <Loader label="Loading roster…" />}

      {error && !data && <LoadError message={error} onRetry={refresh} />}

      {data && barbers.length === 0 && (
        <EmptyState
          title="No barbers yet"
          description="Add a barber and set their weekly hours to open up bookable slots."
          action={<Button onClick={openCreate}>Add barber</Button>}
        />
      )}

      {data && barbers.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {barbers.map((barber) => (
            <li key={barber.id}>
              <Card
                className={cn(
                  "flex h-full flex-col p-5 rounded-2xl border-slate-200/80 shadow-card hover:shadow-card-hover transition-shadow",
                  !barber.isActive && "opacity-75 bg-slate-50/60",
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-slate-200 shadow-sm bg-slate-100">
                    <Image
                      src={getBarberPhotoUrl(barber)}
                      alt={barber.name}
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="truncate text-base font-bold text-primary">
                        {barber.name}
                      </p>
                      <Badge tone={barber.isActive ? "success" : "neutral"} className="text-[10px]">
                        {barber.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-slate-500 mt-0.5">
                      {barber.phone ?? barber.email ?? "No contact details"}
                    </p>
                  </div>
                </div>

                {barber.specializations.length > 0 && (
                  <p className="mt-3 text-xs text-slate-500">
                    {barber.specializations.join(" · ")}
                  </p>
                )}

                <div className="mt-3 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Services
                  </p>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {barber.services && barber.services.length > 0
                      ? barber.services.map((service) => service.name).join(", ")
                      : "None — this barber cannot be booked."}
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(barber)}
                  >
                    Edit schedule
                  </Button>
                  {barber.isActive ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-red-50"
                      disabled={pendingId === barber.id}
                      onClick={() => {
                        setConfirmError(null);
                        setConfirmTarget(barber);
                      }}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pendingId === barber.id}
                      onClick={() => reactivate(barber)}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {error && data && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm font-semibold text-danger"
        >
          Couldn&rsquo;t refresh: {error}
        </p>
      )}

      <BarberFormDialog
        barberId={editingId}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        services={services}
        onSaved={(saved, message) => {
          setIsFormOpen(false);
          push("success", `${saved.name} — ${message.toLowerCase()}`);
          refresh();
        }}
      />

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTarget(null);
            setConfirmError(null);
          }
        }}
        title={`Deactivate ${confirmTarget?.name ?? "this barber"}?`}
        description="They disappear from the booking wizard immediately. Their existing appointments stay exactly as they are, and you can reactivate them at any time."
        confirmLabel="Deactivate"
        cancelLabel="Keep them active"
        isPending={pendingId !== null && confirmTarget !== null}
        error={confirmError}
        onConfirm={deactivate}
      />

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
