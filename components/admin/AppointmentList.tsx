"use client";

import Image from "next/image";
import {
  Button,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui";
import { quickActions, type StatusAction } from "@/lib/admin/transitions";
import type { Appointment, AppointmentStatus } from "@/lib/booking/types";
import { cn } from "@/lib/utils/cn";
import { formatPrice, initials } from "@/lib/utils/format";
import { formatDuration, formatTime12h } from "@/lib/utils/time";
import { formatAdminDate } from "@/lib/admin/format";
import { getBarberPhotoUrl } from "@/lib/utils/barberImages";

/**
 * Appointment rendering, shared by the diary (`/dashboard/appointments`) and the
 * dashboard.
 *
 * WHY A TABLE AND A CARD LIST RATHER THAN ONE RESPONSIVE THING: a diary row is
 * seven facts wide (time, client, phone, service, barber, price, status) and
 * that is genuinely a table on a desktop — scanning DOWN a column is the whole
 * job at the front desk. Squashed onto a 375px phone the same table is
 * unreadable at any font size, so under `sm` the identical data is re-laid-out
 * as cards. Both are driven by the same props; neither is a second source of
 * truth.
 */

/** "10:00 AM – 10:30 AM" */
export function formatSlot(appointment: Appointment): string {
  return `${formatTime12h(appointment.startTime)} – ${formatTime12h(appointment.endTime)}`;
}

function actionVariant(action: StatusAction) {
  switch (action.emphasis) {
    case "primary":
      return { variant: "primary" as const, className: undefined };
    case "danger":
      // Not `variant="danger"`: a solid red button on every row of a busy diary
      // reads as an alarm. The outline keeps it clearly destructive but calm.
      return {
        variant: "outline" as const,
        className: "text-danger hover:border-danger hover:bg-red-50 hover:text-danger",
      };
    default:
      return { variant: "outline" as const, className: undefined };
  }
}

function QuickActions({
  appointment,
  onAction,
  isPending,
  className,
}: {
  appointment: Appointment;
  onAction: (appointment: Appointment, status: AppointmentStatus) => void;
  isPending: boolean;
  className?: string;
}) {
  const actions = quickActions(appointment.status);
  if (actions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {actions.map((action) => {
        const { variant, className: actionClassName } = actionVariant(action);
        return (
          <Button
            key={action.status}
            size="sm"
            variant={variant}
            className={actionClassName}
            disabled={isPending}
            onClick={() => onAction(appointment, action.status)}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

export interface AppointmentListProps {
  appointments: Appointment[];
  /** Open the detail dialog (notes, full transition list, reschedule). */
  onOpen: (appointment: Appointment) => void;
  onAction: (appointment: Appointment, status: AppointmentStatus) => void;
  /** Id of the row with a mutation in flight — its buttons are disabled. */
  pendingId?: string | null;
  /** Show the appointment's date (only useful when the list spans days). */
  showDate?: boolean;
}

export function AppointmentList({
  appointments,
  onOpen,
  onAction,
  pendingId = null,
  showDate = false,
}: AppointmentListProps) {
  return (
    <>
      {/* ------------------------------- Desktop ------------------------- */}
      <TableScroll className="hidden sm:block">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{showDate ? "When" : "Time"}</TableHeaderCell>
              <TableHeaderCell>Client</TableHeaderCell>
              <TableHeaderCell>Service</TableHeaderCell>
              <TableHeaderCell>Barber</TableHeaderCell>
              <TableHeaderCell className="text-right">Price</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments.map((appointment) => {
              const isPending = pendingId === appointment.id;
              const isDead =
                appointment.status === "CANCELLED" ||
                appointment.status === "NO_SHOW";

              return (
                <TableRow key={appointment.id} muted={isDead}>
                  <TableCell className="whitespace-nowrap font-semibold tabular-nums">
                    {showDate && (
                      <span className="block text-xs font-medium text-slate-500">
                        {formatAdminDate(appointment.appointmentDate)}
                      </span>
                    )}
                    {formatSlot(appointment)}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
                        {initials(appointment.client?.name ?? "C")}
                      </span>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpen(appointment)}
                          className="rounded text-left font-semibold text-primary underline-offset-2 hover:text-secondary-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                        >
                          {appointment.client?.name ?? "Unknown client"}
                        </button>
                        {appointment.client?.phone && (
                          <span className="block text-xs text-slate-500">
                            {appointment.client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-slate-700">{appointment.service?.name ?? "—"}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200">
                        <Image
                          src={getBarberPhotoUrl(appointment.barber)}
                          alt=""
                          fill
                          sizes="28px"
                          className="object-cover object-top"
                        />
                      </div>
                      <span className="font-medium text-slate-800">
                        {appointment.barber?.name ?? "Unassigned"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                    {formatPrice(appointment.price)}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={appointment.status} />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <QuickActions
                        appointment={appointment}
                        onAction={onAction}
                        isPending={isPending}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpen(appointment)}
                      >
                        Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableScroll>

      {/* -------------------------------- Mobile -------------------------- */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {appointments.map((appointment) => {
          const isPending = pendingId === appointment.id;
          const isDead =
            appointment.status === "CANCELLED" || appointment.status === "NO_SHOW";

          return (
            <li
              key={appointment.id}
              className={cn(
                "rounded-card border border-slate-200 bg-surface p-4 shadow-card",
                isDead && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200">
                    <Image
                      src={getBarberPhotoUrl(appointment.barber)}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover object-top"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold tabular-nums text-primary">
                      {showDate && (
                        <span className="mr-1 font-medium text-slate-500">
                          {formatAdminDate(appointment.appointmentDate)}
                        </span>
                      )}
                      {formatSlot(appointment)}
                    </p>
                    <p className="mt-0.5 truncate text-base font-semibold text-primary">
                      {appointment.client?.name ?? "Unknown client"}
                    </p>
                    <p className="text-xs text-slate-600">
                      {appointment.service?.name ?? "—"}
                      {appointment.barber?.name ? ` · ${appointment.barber.name}` : ""}
                    </p>
                  </div>
                </div>
                <StatusPill status={appointment.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <QuickActions
                  appointment={appointment}
                  onAction={onAction}
                  isPending={isPending}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onOpen(appointment)}
                >
                  Details
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * The dashboard's read-only view of the day: a vertical timeline rather than a
 * table, because on the Today screen the question is "what happens next", which
 * is answered by the ORDER of the rows, not by comparing columns.
 */
export function AppointmentTimeline({
  appointments,
  onOpen,
}: {
  appointments: Appointment[];
  onOpen?: (appointment: Appointment) => void;
}) {
  return (
    <ol className="flex flex-col">
      {appointments.map((appointment, index) => {
        const isDead =
          appointment.status === "CANCELLED" || appointment.status === "NO_SHOW";

        const content = (
          <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="w-20 shrink-0 text-sm font-bold tabular-nums text-primary">
              {formatTime12h(appointment.startTime)}
            </span>
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200">
              <Image
                src={getBarberPhotoUrl(appointment.barber)}
                alt=""
                fill
                sizes="32px"
                className="object-cover object-top"
              />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-primary">
                {appointment.client?.name ?? "Unknown client"}
              </span>
              <span className="block truncate text-xs text-slate-600">
                {appointment.service?.name ?? "—"}
                {appointment.barber?.name ? ` · ${appointment.barber.name}` : ""}
                {` · ${formatDuration(appointment.durationMinutes)}`}
              </span>
            </span>
            <StatusPill status={appointment.status} />
          </div>
        );

        return (
          <li
            key={appointment.id}
            className={cn(
              "border-slate-100 py-2.5",
              index > 0 && "border-t",
              isDead && "opacity-60",
            )}
          >
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(appointment)}
                className="-mx-2 flex w-[calc(100%+1rem)] rounded-lg px-2 py-1 text-left transition-colors hover:bg-secondary-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
