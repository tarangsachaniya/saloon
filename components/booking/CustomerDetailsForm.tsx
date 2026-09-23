"use client";

import { useState, type FormEvent } from "react";
import { useBooking } from "@/lib/booking/BookingContext";
import { Button, Input, Textarea } from "@/components/ui";
import { customerDetailsSchema, fieldErrors } from "@/lib/validation/booking";
import { StepShell } from "./StepShell";

/**
 * Step 5 — contact details.
 *
 * The context is the single source of truth for the field values (so stepping
 * away and back preserves what was typed); only the validation errors are local
 * state. Validation runs on submit via `customerDetailsSchema`, and each field's
 * error clears as soon as the customer edits it — re-validating on every
 * keystroke shouts at people who are still halfway through typing a phone
 * number.
 */
export function CustomerDetailsForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { customer, setCustomer } = useBooking();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(field: keyof typeof customer, value: string) {
    setCustomer({ [field]: value });
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = customerDetailsSchema.safeParse({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
    });

    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setErrors({});
    onSubmitted();
  }

  return (
    <StepShell
      title="Your details"
      description="We only use these to hold your appointment and to reach you if anything changes."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            required
            autoComplete="name"
            placeholder="Priya Sharma"
            value={customer.name}
            error={errors.name}
            onChange={(event) => update("name", event.target.value)}
          />

          <Input
            label="Phone number"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={customer.phone}
            error={errors.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
        </div>

        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          hint="Optional — add it if you'd like a written confirmation."
          value={customer.email}
          error={errors.email}
          onChange={(event) => update("email", event.target.value)}
        />

        <Textarea
          label="Notes for your barber"
          rows={3}
          maxLength={500}
          placeholder="Anything we should know before you arrive?"
          hint="Optional."
          value={customer.notes}
          error={errors.notes}
          onChange={(event) => update("notes", event.target.value)}
        />

        <Button type="submit" size="lg" fullWidth className="sm:w-auto sm:self-end sm:px-8">
          Review booking
        </Button>
      </form>
    </StepShell>
  );
}
