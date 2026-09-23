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
  Textarea,
  Toggle,
} from "@/components/ui";
import { createService, updateService } from "@/lib/api";
import { toErrorMessage } from "@/lib/admin/useAdminData";
import type { Service } from "@/lib/booking/types";
import { serviceFormSchema } from "@/lib/validation/admin";
import { fieldErrors } from "@/lib/validation/booking";
import { FormError } from "./PageHeader";

/**
 * Add or edit a service.
 *
 * Modal rather than inline/spreadsheet editing — the project's decided pattern
 * for admin records. It also suits the data: price and duration are the two
 * numbers a whole booking is computed from, and committing them behind an
 * explicit Save is safer than a field that writes as you type.
 */

export interface ServiceFormDialogProps {
  /** null = create a new service. */
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (service: Service, message: string) => void;
}

export function ServiceFormDialog({
  service,
  open,
  onOpenChange,
  onSaved,
}: ServiceFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-lg">
        <ServiceForm
          // Remount per record so the fields never carry over from the last one.
          key={service?.id ?? "new"}
          service={service}
          onCancel={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

function ServiceForm({
  service,
  onCancel,
  onSaved,
}: {
  service: Service | null;
  onCancel: () => void;
  onSaved: (service: Service, message: string) => void;
}) {
  const isEdit = service !== null;

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  // Numbers live as strings: an <input type="number"> is a string field, and
  // coercing on every keystroke makes a half-typed "1" become 1 and fight back.
  const [price, setPrice] = useState(
    service ? String(service.price) : "",
  );
  const [duration, setDuration] = useState(
    service ? String(service.durationMinutes) : "30",
  );
  const [category, setCategory] = useState(service?.category ?? "");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const parsed = serviceFormSchema.safeParse({
      name,
      description,
      price: price.trim() === "" ? Number.NaN : Number(price),
      durationMinutes: duration.trim() === "" ? Number.NaN : Number(duration),
      category,
      isActive,
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError(null);
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSaving(true);

    const payload = {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      durationMinutes: parsed.data.durationMinutes,
      category: parsed.data.category ? parsed.data.category : null,
      isActive: parsed.data.isActive,
    };

    try {
      const saved = isEdit
        ? await updateService(service.id, payload)
        : await createService(payload);
      onSaved(saved, isEdit ? "Service updated." : "Service added.");
    } catch (cause) {
      setFormError(toErrorMessage(cause));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit service" : "Add a service"}</DialogTitle>
        <DialogDescription>
          Price and duration drive the booking wizard&rsquo;s slot grid, so a
          change here changes what customers can book.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 flex flex-col gap-4">
        <Input
          label="Name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          placeholder="Haircut"
        />

        <Textarea
          label="Description"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          error={errors.description}
          placeholder="Classic haircut, wash included"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Price (₹)"
            required
            type="number"
            inputMode="decimal"
            min={0}
            step={10}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            error={errors.price}
          />
          <Input
            label="Duration (minutes)"
            required
            type="number"
            inputMode="numeric"
            min={5}
            step={5}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            error={errors.durationMinutes}
            hint="Must fit the salon's slot interval."
          />
        </div>

        <Input
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          error={errors.category}
          placeholder="Hair"
          hint="Optional — groups services on the booking page."
        />

        <Toggle
          checked={isActive}
          onCheckedChange={setIsActive}
          label="Bookable"
          description={
            isActive
              ? "Customers can book this service."
              : "Hidden from the booking wizard. Existing appointments are unaffected."
          }
          block
        />

        <FormError message={formError} />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={save} isLoading={isSaving}>
          {isEdit ? "Save changes" : "Add service"}
        </Button>
      </DialogFooter>
    </>
  );
}
