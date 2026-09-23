"use client";

import { useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  StatusPill,
  Textarea,
} from "@/components/ui";
import { updateAppointment } from "@/lib/api";
import { actionLabel, allowedTransitions, isTerminal } from "@/lib/admin/transitions";
import { toErrorMessage } from "@/lib/admin/useAdminData";
import type { Appointment, AppointmentStatus } from "@/lib/booking/types";
import { formatPrice } from "@/lib/utils/format";
import { formatDuration, formatTime12h } from "@/lib/utils/time";
import { formatAdminDate } from "@/lib/admin/format";
import { FormError } from "./PageHeader";

/**
 * One appointment in full: who, what, when, the complete set of legal status
 * moves, and the notes field.
 *
 * The row buttons in the diary deliberately offer only the natural next step
 * plus the two "didn't happen" outcomes (see `lib/admin/transitions.ts`). This
 * dialog is where the rest of the legal set lives — jumping a walk-in straight
 * from PENDING to COMPLETED is a real thing a salon does, it just should not be
 * one mis-tap away in a list.
 *
 * Every button here comes from `allowedTransitions`, which mirrors the
 * backend's `isValidTransition`, so the UI never offers a move the server will
 * answer with a 400.
 */

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-primary">{children}</dd>
    </div>
  );
}

export interface AppointmentDetailDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (appointment: Appointment, message: string) => void;
  onReschedule: (appointment: Appointment) => void;
}

export function AppointmentDetailDialog({
  appointment,
  open,
  onOpenChange,
  onSaved,
  onReschedule,
}: AppointmentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {appointment && (
          <DetailBody
            key={appointment.id}
            appointment={appointment}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
            onReschedule={onReschedule}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({
  appointment,
  onClose,
  onSaved,
  onReschedule,
}: {
  appointment: Appointment;
  onClose: () => void;
  onSaved: (appointment: Appointment, message: string) => void;
  onReschedule: (appointment: Appointment) => void;
}) {
  const [notes, setNotes] = useState(appointment.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const transitions = allowedTransitions(appointment.status);
  const notesChanged = notes.trim() !== (appointment.notes ?? "").trim();
  const isBusy = pendingStatus !== null || isSavingNotes;

  async function changeStatus(status: AppointmentStatus) {
    setPendingStatus(status);
    setError(null);
    try {
      const updated = await updateAppointment(appointment.id, { status });
      onSaved(updated, `Marked as ${actionLabel(status).toLowerCase()}.`);
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setPendingStatus(null);
    }
  }

  async function saveNotes() {
    setIsSavingNotes(true);
    setError(null);
    try {
      // An emptied box means "remove the note", which the API models as null.
      const updated = await updateAppointment(appointment.id, {
        notes: notes.trim() === "" ? null : notes.trim(),
      });
      onSaved(updated, "Notes saved.");
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setIsSavingNotes(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{appointment.client?.name ?? "Appointment"}</DialogTitle>
        <DialogDescription>
          {appointment.client?.phone ?? "No phone on file"}
          {appointment.client?.email ? ` · ${appointment.client.email}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-4">
          <Fact label="When">
            {formatAdminDate(appointment.appointmentDate)}
            <span className="block font-normal text-slate-600">
              {formatTime12h(appointment.startTime)} –{" "}
              {formatTime12h(appointment.endTime)} (
              {formatDuration(appointment.durationMinutes)})
            </span>
          </Fact>
          <Fact label="Status">
            <StatusPill status={appointment.status} />
          </Fact>
          <Fact label="Service">
            {appointment.service?.name ?? "—"}
            <span className="block font-normal text-slate-600">
              {formatPrice(appointment.price)}
            </span>
          </Fact>
          <Fact label="Barber">{appointment.barber?.name ?? "—"}</Fact>
        </dl>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Change status
          </p>
          {isTerminal(appointment.status) ? (
            <p className="text-sm text-slate-600">
              This appointment is completed — its status is final. Notes can
              still be edited below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transitions.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={
                    status === "CANCELLED" || status === "NO_SHOW"
                      ? "outline"
                      : "primary"
                  }
                  className={
                    status === "CANCELLED" || status === "NO_SHOW"
                      ? "text-danger hover:border-danger hover:bg-red-50 hover:text-danger"
                      : undefined
                  }
                  isLoading={pendingStatus === status}
                  disabled={isBusy && pendingStatus !== status}
                  onClick={() => changeStatus(status)}
                >
                  {actionLabel(status)}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Textarea
            label="Notes"
            value={notes}
            rows={3}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything the barber should know…"
            disabled={isBusy}
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={saveNotes}
              isLoading={isSavingNotes}
              disabled={!notesChanged || pendingStatus !== null}
            >
              Save notes
            </Button>
          </div>
        </div>

        <FormError message={error} />
      </div>

      <DialogFooter className="sm:justify-between">
        <Button
          variant="outline"
          onClick={() => onReschedule(appointment)}
          disabled={isBusy}
        >
          Reschedule…
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={isBusy}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}
