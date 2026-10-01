"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { rescheduleMyAppointment, type MyAppointment } from "@/lib/api/account";
import { getAvailability, getSettings } from "@/lib/api";
import { isApiError } from "@/lib/api/client";
import type { AvailabilityResponse, SalonSettings, Slot } from "@/lib/booking/types";
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Loader,
  maxBookableDate,
} from "@/components/ui";
import { SlotButton } from "@/components/booking/SlotGrid";
import { formatDateLong, formatTime12h, startOfToday } from "@/lib/utils/time";
import { DIALOG_THEME } from "./CancelAppointmentDialog";

type Step = "date" | "time" | "review";

const errorText = (e: unknown, fallback: string) =>
  isApiError(e) && e.isNetworkError
    ? "We couldn't reach the server. Check your connection and try again."
    : isApiError(e) && e.status >= 400 && e.status < 500
      ? e.message
      : fallback;

/**
 * Move an existing appointment: date -> time -> review -> confirm.
 *
 * Reuses the booking flow's Calendar and slot button, and the same public
 * availability endpoint the wizard uses (with this appointment excluded so it
 * doesn't block its own neighbours). The server re-validates everything on
 * confirm; a slot lost in the meantime sends the customer back to the time
 * grid with the date kept.
 */
export function RescheduleAppointmentDialog({
  appointment,
  onClose,
  onRescheduled,
}: {
  appointment: MyAppointment | null;
  onClose: () => void;
  onRescheduled: (next: MyAppointment) => void;
}) {
  return (
    <Dialog
      open={appointment !== null}
      // Remount per appointment so every open starts from the date step.
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent style={DIALOG_THEME} className="sm:max-w-xl">
        {appointment && (
          <RescheduleBody key={appointment.id} appointment={appointment} onClose={onClose} onRescheduled={onRescheduled} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RescheduleBody({
  appointment,
  onClose,
  onRescheduled,
}: {
  appointment: MyAppointment;
  onClose: () => void;
  onRescheduled: (next: MyAppointment) => void;
}) {
  const slug = appointment.salon.slug;
  const [step, setStep] = useState<Step>("date");
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Salon booking window + closed weekdays (one small request per open dialog).
  useEffect(() => {
    let cancelled = false;
    getSettings(slug)
      .then((s) => !cancelled && setSettings(s))
      .catch((e) => !cancelled && setSettingsError(errorText(e, "We couldn't load the calendar. Please try again.")));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const closedWeekdays = useMemo(
    () => new Set((settings?.openingHours ?? []).filter((h) => !h.isOpen).map((h) => h.weekday)),
    [settings],
  );

  // Availability for the chosen date only; a superseded request is aborted, so a
  // slow reply for an earlier date can never overwrite the current one.
  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    setSlotsLoading(true);
    setSlotsError(null);
    setAvailability(null);
    getAvailability(
      slug,
      { serviceId: appointment.service.id, barberId: appointment.barber.id, date, excludeAppointmentId: appointment.id },
      { signal: controller.signal },
    )
      .then((a) => {
        setAvailability(a);
        setSlotsLoading(false);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setSlotsError(errorText(e, "We couldn't check availability. Please try again."));
        setSlotsLoading(false);
      });
    return () => controller.abort();
  }, [slug, appointment.id, appointment.service.id, appointment.barber.id, date, retry]);

  function go(next: Step) {
    setStep(next);
    // Keep the new step in view inside the (scrollable) sheet, smoothly.
    requestAnimationFrame(() =>
      bodyRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  }

  async function confirm() {
    if (saving || !date || !slot) return;
    setSaving(true);
    setFailure(null);
    try {
      onRescheduled(await rescheduleMyAppointment(appointment.id, { date, startTime: slot.start }));
    } catch (e) {
      const conflict = isApiError(e) && e.status === 409;
      setFailure(
        conflict
          ? "This time is no longer available. Please select another time."
          : errorText(e, "Unable to reschedule this appointment. Please try again."),
      );
      if (conflict) {
        // Back to the time grid (same date), refreshed so the taken slot is greyed out.
        setSlot(null);
        setRetry((n) => n + 1);
        go("time");
      }
    } finally {
      setSaving(false);
    }
  }

  const title = { date: "Choose a new date", time: "Choose a new time", review: "Review your change" }[step];
  const slots = availability?.slots ?? [];
  const freeCount = slots.filter((s) => s.available).length;
  const isCurrent = (s: Slot) => date === appointment.date && s.start === appointment.startTime;

  return (
    <div ref={bodyRef} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Reschedule</DialogTitle>
        <DialogDescription>
          {appointment.service.name} with {appointment.barber.name} · currently {formatDateLong(appointment.date)},{" "}
          {formatTime12h(appointment.startTime)}
        </DialogDescription>
      </DialogHeader>

      <p className="text-sm font-bold text-primary" aria-live="polite">
        Step {["date", "time", "review"].indexOf(step) + 1} of 3: {title}
      </p>

      {failure && (
        <p role="alert" className="rounded-xl border-2 border-plum bg-tomato/25 px-3 py-2 text-sm font-bold text-plum">
          {failure}
        </p>
      )}

      {step === "date" && (
        <div className="flex flex-col gap-3 animate-fade-in">
          {settingsError && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {settingsError}
            </p>
          )}
          {!settings && !settingsError && <Loader label="Loading available dates…" />}
          {settings && (
            <Calendar
              className="mx-auto"
              value={date}
              onChange={(d) => {
                setDate(d);
                setSlot(null);
                setFailure(null);
                go("time");
              }}
              minDate={startOfToday()}
              maxDate={maxBookableDate(settings.maximumAdvanceBookingDays)}
              isDateDisabled={(d) => closedWeekdays.has(d.getDay())}
            />
          )}
        </div>
      )}

      {step === "time" && date && (
        <div className="flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600">{formatDateLong(date)}</p>
            <Button variant="ghost" size="sm" onClick={() => go("date")} disabled={saving}>
              Change date
            </Button>
          </div>
          {slotsLoading && <Loader label="Loading available times…" />}
          {slotsError && (
            <div role="alert" className="flex flex-col items-start gap-2">
              <p className="text-sm font-semibold text-danger">{slotsError}</p>
              <Button variant="outline" size="sm" onClick={() => setRetry((n) => n + 1)}>
                Try again
              </Button>
            </div>
          )}
          {availability && freeCount === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-bold text-primary">No available times for this date.</p>
              <p className="mt-1">Choose another date.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => go("date")}>
                Pick another date
              </Button>
            </div>
          )}
          {availability && freeCount > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <li key={s.start}>
                  <SlotButton
                    slot={isCurrent(s) ? { ...s, available: false } : s}
                    selected={slot?.start === s.start && s.available}
                    onSelect={() => {
                      setSlot(s);
                      setFailure(null);
                      go("review");
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step === "review" && date && slot && (
        <div className="flex flex-col gap-3 animate-fade-in">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{formatDateLong(appointment.date)}</p>
              <p className="text-sm font-semibold text-slate-700">{formatTime12h(appointment.startTime)}</p>
            </div>
            <div className="rounded-xl border-2 border-primary bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-secondary-700">New</p>
              <p className="mt-1 text-sm font-extrabold text-primary">{formatDateLong(date)}</p>
              <p className="text-sm font-extrabold text-primary">
                {formatTime12h(slot.start)} – {formatTime12h(slot.end)}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Same service, barber and price. Only the time changes.</p>
        </div>
      )}

      <DialogFooter className="mt-1">
        {step === "review" ? (
          <>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Keep current
            </Button>
            <Button onClick={confirm} isLoading={saving}>
              {saving ? "Rescheduling…" : "Confirm reschedule"}
            </Button>
          </>
        ) : (
          <>
            {step === "time" && (
              <Button variant="ghost" onClick={() => go("date")}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Keep current
            </Button>
          </>
        )}
      </DialogFooter>
    </div>
  );
}
