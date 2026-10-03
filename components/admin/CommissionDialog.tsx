"use client";

import { useState, type FormEvent } from "react";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from "@/components/ui";
import { setCommissionRate, type CommissionRate } from "@/lib/api/commissions";
import { isApiError } from "@/lib/api";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { FormError } from "./PageHeader";

/** Same rule as the server: a number 0-100 with at most 2 decimals. */
export function validatePercentage(raw: string): { value: number } | { error: string } {
  const text = raw.trim();
  if (text === "") return { error: "Enter a percentage." };
  if (!/^\d+(\.\d+)?$/.test(text)) return { error: "Enter a number, like 40 or 37.5." };
  const value = Number(text);
  if (value < 0 || value > 100) return { error: "Commission must be between 0 and 100." };
  if (Math.abs(Math.round(value * 100) - value * 100) > 1e-6) return { error: "Use at most 2 decimal places." };
  return { value };
}

/** Same rule as the server: an amount of 0 or more with at most 2 decimals. */
export function validateFlatAmount(raw: string): { value: number } | { error: string } {
  const text = raw.trim();
  if (text === "") return { error: "Enter an amount." };
  if (!/^\d+(\.\d+)?$/.test(text)) return { error: "Enter an amount, like 50 or 75.50." };
  const value = Number(text);
  if (value > 1_000_000) return { error: "That amount is too large." };
  if (Math.abs(Math.round(value * 100) - value * 100) > 1e-6) return { error: "Use at most 2 decimal places." };
  return { value };
}

/** "40%" or "₹50 / service". */
export function formatCommissionRate(rate: CommissionRate): string {
  return rate.commissionType === "FLAT"
    ? `${formatPrice(rate.commissionFlatAmount)} / service`
    : `${rate.commissionPercentage}%`;
}

type Worker = { id: string; name: string } & CommissionRate;

export function CommissionDialog({
  worker,
  onClose,
  onSaved,
}: {
  worker: Worker | null;
  onClose: () => void;
  onSaved: (id: string, rate: CommissionRate) => void;
}) {
  return (
    <Dialog open={!!worker} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* Remounted per worker so the fields always start from that worker's values. */}
        {worker && <CommissionForm key={worker.id} worker={worker} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function CommissionForm({
  worker,
  onClose,
  onSaved,
}: {
  worker: Worker;
  onClose: () => void;
  onSaved: (id: string, rate: CommissionRate) => void;
}) {
  const [type, setType] = useState<"PERCENT" | "FLAT">(worker.commissionType);
  const [percentText, setPercentText] = useState(String(worker.commissionPercentage));
  const [flatText, setFlatText] = useState(String(worker.commissionFlatAmount));
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setFormError(null);
    const checked = type === "PERCENT" ? validatePercentage(percentText) : validateFlatAmount(flatText);
    if ("error" in checked) {
      setFieldError(checked.error);
      return;
    }
    setFieldError(undefined);
    setSaving(true);
    try {
      const res = await setCommissionRate(
        worker.id,
        type === "PERCENT"
          ? { commissionType: "PERCENT", commissionPercentage: checked.value }
          : { commissionType: "FLAT", commissionFlatAmount: checked.value },
      );
      onSaved(worker.id, res.barber);
    } catch (error) {
      setFormError(
        isApiError(error) && error.status >= 400 && error.status < 500
          ? error.message
          : "We couldn't save the commission. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const options: { id: "PERCENT" | "FLAT"; label: string; hint: string }[] = [
    { id: "PERCENT", label: "Percentage", hint: "Share of the amount charged" },
    { id: "FLAT", label: "Flat amount", hint: "Fixed amount per service done" },
  ];

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>Edit commission</DialogTitle>
        <DialogDescription>
          What {worker.name} earns on each completed visit, online bookings and walk-ins alike. Changes apply to
          visits completed from now on; past commission keeps the rate it was earned at.
        </DialogDescription>
      </DialogHeader>

      <div role="radiogroup" aria-label="Commission type" className="mt-4 grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={type === o.id}
            disabled={saving}
            onClick={() => {
              setType(o.id);
              setFieldError(undefined);
            }}
            className={cn(
              "rounded-xl p-3 text-left ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
              type === o.id ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-primary ring-slate-200 hover:bg-slate-50",
            )}
          >
            <span className="block text-sm font-bold">{o.label}</span>
            <span className={cn("block text-xs", type === o.id ? "opacity-80" : "text-slate-500")}>{o.hint}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2">
        {type === "PERCENT" ? (
          <>
            <Input
              label="Commission percentage"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={percentText}
              onChange={(e) => {
                setPercentText(e.target.value);
                setFieldError(undefined);
              }}
              error={fieldError}
              disabled={saving}
              hint="0 to 100, for example 40 or 37.5"
              containerClassName="flex-1"
            />
            <span aria-hidden className="pt-9 text-lg font-bold text-slate-500">
              %
            </span>
          </>
        ) : (
          <Input
            label="Amount per service"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={flatText}
            onChange={(e) => {
              setFlatText(e.target.value);
              setFieldError(undefined);
            }}
            error={fieldError}
            disabled={saving}
            hint="A visit with 3 services earns 3 × this amount"
            containerClassName="flex-1"
          />
        )}
      </div>

      {formError && (
        <div className="mt-4">
          <FormError message={formError} />
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {saving ? "Saving…" : "Save commission"}
        </Button>
      </DialogFooter>
    </form>
  );
}
