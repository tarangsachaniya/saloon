"use client";

import { useState, type FormEvent } from "react";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from "@/components/ui";
import { setCommissionPercentage } from "@/lib/api/commissions";
import { isApiError } from "@/lib/api";
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

export function CommissionDialog({
  worker,
  onClose,
  onSaved,
}: {
  worker: { id: string; name: string; commissionPercentage: number } | null;
  onClose: () => void;
  onSaved: (id: string, percentage: number) => void;
}) {
  return (
    <Dialog open={!!worker} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* Remounted per worker so the field always starts from that worker's value. */}
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
  worker: { id: string; name: string; commissionPercentage: number };
  onClose: () => void;
  onSaved: (id: string, percentage: number) => void;
}) {
  const [text, setText] = useState(String(worker.commissionPercentage));
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setFormError(null);
    const checked = validatePercentage(text);
    if ("error" in checked) {
      setFieldError(checked.error);
      return;
    }
    setFieldError(undefined);
    setSaving(true);
    try {
      const res = await setCommissionPercentage(worker.id, checked.value);
      onSaved(worker.id, res.barber.commissionPercentage);
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

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>Edit commission</DialogTitle>
        <DialogDescription>
          {worker.name}&rsquo;s share of each completed service. Changes apply to appointments completed from now on;
          past commission keeps the percentage it was earned at.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex items-start gap-2">
        <Input
          label="Commission percentage"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value);
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
