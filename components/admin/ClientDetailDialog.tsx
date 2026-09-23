"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Loader,
  StatusPill,
} from "@/components/ui";
import { getClient } from "@/lib/api";
import { useAdminData } from "@/lib/admin/useAdminData";
import { isRevenueBearing } from "@/lib/admin/transitions";
import type { Client } from "@/lib/booking/types";
import { formatPrice } from "@/lib/utils/format";
import { formatTime12h } from "@/lib/utils/time";
import { formatAdminDate } from "@/lib/admin/format";
import { LoadError } from "./PageHeader";

/**
 * A client's record and their full visit history.
 *
 * A DIALOG RATHER THAN A ROUTE, deliberately: the API has no create/update/
 * delete for clients, so this is a read-only lookup with nothing to lose on
 * dismissal. A modal keeps the search term, the result list and the scroll
 * position exactly where the admin left them — which is the whole interaction
 * at a front desk ("who is this on the phone… right, back to the list"). A
 * nested route would throw that state away and add a history entry for a glance.
 *
 * History comes from `getClient`, which runs it through `normalizeAppointment`,
 * so `price` really is a number and `appointmentDate` really is a calendar date
 * here.
 */

export interface ClientDetailDialogProps {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Row already on screen — used for the heading while the detail loads. */
  fallback?: Client | null;
}

export function ClientDetailDialog({
  clientId,
  open,
  onOpenChange,
  fallback,
}: ClientDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {clientId && (
          <ClientDetail
            key={clientId}
            clientId={clientId}
            fallback={fallback ?? null}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClientDetail({
  clientId,
  fallback,
  onClose,
}: {
  clientId: string;
  fallback: Client | null;
  onClose: () => void;
}) {
  const { data, error, isLoading, refresh } = useAdminData(
    (signal) => getClient(clientId, { signal }),
    [clientId],
  );

  const client = data ?? fallback;
  const history = data?.appointments ?? [];

  const spend = history
    .filter((appointment) => isRevenueBearing(appointment.status))
    .reduce(
      (total, appointment) =>
        total + (Number.isFinite(appointment.price) ? appointment.price : 0),
      0,
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{client?.name ?? "Client"}</DialogTitle>
        <DialogDescription>
          {client?.phone ?? ""}
          {client?.email ? ` · ${client.email}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 flex flex-col gap-5">
        {client && (
          <dl className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-surface-muted px-3 py-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Visits
              </dt>
              <dd className="text-lg font-extrabold tabular-nums text-primary">
                {client.totalVisits}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-surface-muted px-3 py-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Last visit
              </dt>
              <dd className="text-sm font-semibold text-primary">
                {client.lastVisit ? formatAdminDate(client.lastVisit) : "Never"}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-surface-muted px-3 py-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Total spend
              </dt>
              <dd className="text-lg font-extrabold tabular-nums text-primary">
                {data ? formatPrice(spend) : "—"}
              </dd>
            </div>
          </dl>
        )}

        {client?.notes && (
          <p className="rounded-lg border border-slate-200 bg-surface-muted px-3 py-2 text-sm text-slate-700">
            {client.notes}
          </p>
        )}

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Appointment history
          </p>

          {isLoading && <Loader label="Loading history…" />}

          {error && !data && <LoadError message={error} onRetry={refresh} />}

          {data && history.length === 0 && (
            <EmptyState
              title="No appointments yet"
              description="This client has never been booked in."
            />
          )}

          {history.length > 0 && (
            <ol className="flex flex-col divide-y divide-slate-100">
              {history.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                >
                  <span className="w-32 shrink-0 text-sm font-semibold text-primary">
                    {formatAdminDate(appointment.appointmentDate)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-primary">
                      {appointment.service?.name ?? "—"}
                      {appointment.barber?.name
                        ? ` · ${appointment.barber.name}`
                        : ""}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {formatTime12h(appointment.startTime)} ·{" "}
                      {formatPrice(appointment.price)}
                    </span>
                  </span>
                  <StatusPill status={appointment.status} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}
