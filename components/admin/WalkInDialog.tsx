"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
} from "@/components/ui";
import { createWalkIn } from "@/lib/api";
import { toErrorMessage } from "@/lib/admin/useAdminData";
import type { Appointment, Barber, Service } from "@/lib/booking/types";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { formatDuration } from "@/lib/utils/time";
import { validateFlatAmount } from "./CommissionDialog";
import { FormError } from "./PageHeader";

/**
 * Record offline work (owner or worker) that is already done: services, who did
 * them and what the customer paid. It is saved as COMPLETED at once, off the
 * calendar, and the worker's commission is created at the rate the owner set.
 *
 * Nobody but a customer books ahead (on the website or app), so there is no
 * calendar option here.
 *
 * The amount defaults to the sum of the service prices; whoever records it can
 * enter what the customer actually paid. Commission is based on that amount.
 */

export interface WalkInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbers: Barber[];
  services: Service[];
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
  lockedBarberId,
  onClose,
  onSaved,
}: Omit<WalkInDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [barberId, setBarberId] = useState(lockedBarberId ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amountText, setAmountText] = useState<string | null>(null);
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

  function toggleService(id: string) {
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
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
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError(null);
    try {
      const appointment = await createWalkIn({
        barberId,
        serviceIds,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        ...(amountCharged !== undefined ? { amountCharged } : {}),
      });
      onSaved(appointment);
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record walk-in sale</DialogTitle>
        <DialogDescription>
          Work already done offline. It earns the worker&rsquo;s commission just like an online booking.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 flex flex-col gap-4">
        <Select
          label="Worker"
          placeholder="Who did the work?"
          options={activeBarbers.map((b) => ({ value: b.id, label: b.name }))}
          value={barberId}
          onValueChange={setBarberId}
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

        <FormError message={error} />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} isLoading={saving}>
          Record sale
        </Button>
      </DialogFooter>
    </>
  );
}
