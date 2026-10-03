"use client";

import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Loader,
  Select,
} from "@/components/ui";
import { createWalkIn, getAdminBarberAvailability } from "@/lib/api";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import type { Appointment, AvailabilityResponse, Barber, Service } from "@/lib/booking/types";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { addDays, formatDuration, formatTime12h, startOfToday, toDateString } from "@/lib/utils/time";
import { formatAdminDate } from "@/lib/admin/format";
import { validateFlatAmount } from "./CommissionDialog";
import { FormError } from "./PageHeader";

/**
 * Record offline work (owner or staff). Customers never do this - they only
 * pre-book online.
 *
 *  - "Completed sale": the work is done; it is recorded now as COMPLETED, off
 *    the calendar, and the worker's commission is created at once at the rate
 *    the owner set.
 *  - "Book on calendar": a walk-in waiting for a free chair, put into a real
 *    slot (same availability rules as any booking) and completed later.
 *
 * The amount defaults to the sum of the service prices; whoever records it can
 * enter what the customer actually paid. Commission is based on that amount.
 */

type Mode = "sale" | "appointment";

export interface WalkInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbers: Barber[];
  services: Service[];
  maxAdvanceDays: number;
  /** A worker signed in with their own login records only as themselves. */
  lockedBarberId?: string | null;
  onSaved: (appointment: Appointment) => void;
}

export function WalkInDialog({ open, onOpenChange, ...rest }: WalkInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* Remounted on every open so the form always starts empty. */}
        {open && <WalkInForm onClose={() => onOpenChange(false)} {...rest} />}
      </DialogContent>
    </Dialog>
  );
}

function WalkInForm({
  barbers,
  services,
  maxAdvanceDays,
  lockedBarberId,
  onClose,
  onSaved,
}: Omit<WalkInDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const today = useMemo(() => startOfToday(), []);
  const [mode, setMode] = useState<Mode>("sale");
  const [barberId, setBarberId] = useState(lockedBarberId ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amountText, setAmountText] = useState<string | null>(null);
  const [date, setDate] = useState(() => toDateString(today));
  const [startTime, setStartTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const activeBarbers = barbers.filter((b) => b.isActive);
  const activeServices = services.filter((s) => s.isActive);
  const chosen = serviceIds
    .map((id) => activeServices.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));
  const listTotal = chosen.reduce((sum, s) => sum + Number(s.price), 0);
  const duration = chosen.reduce((sum, s) => sum + s.durationMinutes, 0);
  // Untouched amount follows the service total; once typed, it is the user's.
  const amountShown = amountText ?? (chosen.length ? String(listTotal) : "");

  const serviceKey = serviceIds.join(",");
  const availability = useAdminData<AvailabilityResponse | null>(
    (signal) =>
      mode === "appointment" && barberId && serviceKey && date
        ? getAdminBarberAvailability(barberId, { serviceIds: serviceKey.split(","), date }, { signal })
        : Promise.resolve(null),
    [mode, barberId, serviceKey, date],
  );
  const slots = availability.data?.slots ?? [];

  function toggleService(id: string) {
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    setStartTime(null);
  }

  async function save() {
    if (saving) return;
    const errors: Record<string, string> = {};
    if (!barberId) errors.barber = "Choose who did the work.";
    if (chosen.length === 0) errors.services = "Choose at least one service.";
    if (customerPhone.trim() && !customerName.trim()) errors.customerName = "Add the customer's name too.";
    let amountCharged: number | undefined;
    if (amountShown.trim()) {
      const checked = validateFlatAmount(amountShown);
      if ("error" in checked) errors.amount = checked.error;
      else if (checked.value !== listTotal) amountCharged = checked.value;
    }
    if (mode === "appointment" && !startTime) errors.time = "Pick a time.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError(null);
    try {
      const appointment = await createWalkIn({
        mode,
        barberId,
        serviceIds,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        ...(amountCharged !== undefined ? { amountCharged } : {}),
        ...(mode === "appointment" ? { date, startTime: startTime as string } : {}),
      });
      onSaved(appointment);
    } catch (cause) {
      setError(toErrorMessage(cause));
      if (mode === "appointment") availability.refresh();
    } finally {
      setSaving(false);
    }
  }

  const modes: { id: Mode; label: string; hint: string }[] = [
    { id: "sale", label: "Completed sale", hint: "Work done — record it now" },
    { id: "appointment", label: "Book on calendar", hint: "Walk-in waiting for a slot" },
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record walk-in</DialogTitle>
        <DialogDescription>
          Offline work earns the worker&rsquo;s commission just like an online booking.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 flex flex-col gap-4">
        <div role="radiogroup" aria-label="Walk-in type" className="grid grid-cols-2 gap-2">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              disabled={saving}
              onClick={() => {
                setMode(m.id);
                setStartTime(null);
              }}
              className={cn(
                "rounded-xl p-3 text-left ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
                mode === m.id ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-primary ring-slate-200 hover:bg-slate-50",
              )}
            >
              <span className="block text-sm font-bold">{m.label}</span>
              <span className={cn("block text-xs", mode === m.id ? "opacity-80" : "text-slate-500")}>{m.hint}</span>
            </button>
          ))}
        </div>

        <Select
          label="Worker"
          placeholder="Who did the work?"
          options={activeBarbers.map((b) => ({ value: b.id, label: b.name }))}
          value={barberId}
          onValueChange={(next) => {
            setBarberId(next);
            setStartTime(null);
          }}
          disabled={Boolean(lockedBarberId)}
          error={fieldErrors.barber}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-primary">Services</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {activeServices.map((s) => {
              const checked = serviceIds.includes(s.id);
              return (
                <li key={s.id}>
                  <label
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ring-1 transition-colors",
                      checked ? "bg-secondary-50 ring-secondary" : "bg-surface ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-current"
                      checked={checked}
                      disabled={saving}
                      onChange={() => toggleService(s.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-primary">{s.name}</span>
                      <span className="block text-xs text-slate-500">
                        {formatDuration(s.durationMinutes)} · {formatPrice(s.price)}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {fieldErrors.services && <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.services}</p>}
          {chosen.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {chosen.length} {chosen.length === 1 ? "service" : "services"} · {formatDuration(duration)} · list price{" "}
              {formatPrice(listTotal)}
            </p>
          )}
        </fieldset>

        <Input
          label="Amount paid"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={amountShown}
          onChange={(e) => setAmountText(e.target.value)}
          disabled={saving}
          error={fieldErrors.amount}
          hint="Defaults to the service prices — change it if a discount was given."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Customer name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={saving}
            error={fieldErrors.customerName}
          />
          <Input
            label="Customer phone (optional)"
            type="tel"
            inputMode="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            disabled={saving}
          />
        </div>

        {mode === "appointment" && (
          <>
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
              {(!barberId || chosen.length === 0) && (
                <p className="text-sm text-slate-500">Choose the worker and services to see free times.</p>
              )}
              {availability.isLoading && <Loader label="Checking availability…" />}
              {availability.error && <FormError message={availability.error} />}
              {availability.data && slots.length === 0 && (
                <EmptyState
                  title="No times on this day"
                  description="The worker isn't working, the salon is closed, or these services don't fit before closing."
                />
              )}
              {slots.length > 0 && (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {slots.map((slot) => {
                    const selected = startTime === slot.start;
                    return (
                      <li key={slot.start}>
                        <button
                          type="button"
                          disabled={!slot.available || saving}
                          aria-pressed={slot.available ? selected : undefined}
                          onClick={() => setStartTime(slot.start)}
                          className={cn(
                            "flex min-h-11 w-full items-center justify-center rounded-lg px-1 py-1.5 text-sm font-semibold tabular-nums transition-colors",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
                            !slot.available &&
                              "cursor-not-allowed border border-dashed border-slate-200 bg-slate-50 text-slate-400 line-through",
                            slot.available && !selected && "border border-slate-300 bg-surface text-primary hover:border-secondary",
                            selected && "border border-primary bg-primary text-primary-foreground ring-2 ring-primary/25",
                          )}
                        >
                          {formatTime12h(slot.start)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {fieldErrors.time && <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.time}</p>}
            </div>
          </>
        )}

        <FormError message={error} />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} isLoading={saving}>
          {mode === "sale" ? "Record sale" : "Book walk-in"}
        </Button>
      </DialogFooter>
    </>
  );
}
