"use client";

import { useState } from "react";

import { cancelMyAppointment, type MyAppointment } from "@/lib/api/account";
import { isApiError } from "@/lib/api/client";
import { themeStyle } from "@/lib/themes";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui";
import { formatDateLong, formatTime12h } from "@/lib/utils/time";

/** Playful tokens for dialogs, which render in a portal outside the page's own theme. */
export const DIALOG_THEME = themeStyle("PLAYFUL", null);

/**
 * "Are you sure?" before anything changes. The request cannot be closed out of
 * mid-flight, the confirm button is disabled while it runs (no duplicate
 * requests) and a failure is shown inside the dialog.
 */
export function CancelAppointmentDialog({
  appointment,
  onClose,
  onCancelled,
}: {
  appointment: MyAppointment | null;
  onClose: () => void;
  onCancelled: (next: MyAppointment) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!appointment || pending) return;
    setPending(true);
    setError(null);
    try {
      onCancelled(await cancelMyAppointment(appointment.id));
    } catch (e) {
      setError(
        isApiError(e) && e.status >= 400 && e.status < 500
          ? e.message
          : isApiError(e) && e.isNetworkError
            ? "We couldn't reach the server. Check your connection and try again."
            : "Unable to cancel this appointment. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={appointment !== null}
      onOpenChange={(open) => {
        if (!open && !pending) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent style={DIALOG_THEME} hideCloseButton>
        {appointment && (
          <>
            <DialogHeader>
              <DialogTitle>Cancel appointment?</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel {appointment.service.name} at {appointment.salon.name} on{" "}
                {formatDateLong(appointment.date)} at {formatTime12h(appointment.startTime)}? The time will be released for
                others.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="mt-4 rounded-xl border-2 border-plum bg-tomato/25 px-3 py-2 text-sm font-bold text-plum">
                {error}
              </p>
            )}
            <DialogFooter className="mt-5">
              <Button variant="outline" onClick={onClose} disabled={pending}>
                Keep appointment
              </Button>
              <Button variant="danger" onClick={confirm} isLoading={pending}>
                {pending ? "Cancelling…" : "Cancel appointment"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
