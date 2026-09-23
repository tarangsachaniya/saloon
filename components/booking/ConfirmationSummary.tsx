"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { createAppointment, isApiError } from "@/lib/api";
import { useBooking, type BookingStep } from "@/lib/booking/BookingContext";
import type { CreateAppointmentPayload } from "@/lib/booking/types";
import { Button, Card } from "@/components/ui";
import { formatPrice } from "@/lib/utils/format";
import { createAppointmentSchema } from "@/lib/validation/booking";
import { formatDateLong, formatDuration, formatTime12h } from "@/lib/utils/time";
import { StepShell } from "./StepShell";

/**
 * Step 6 — review and confirm.
 *
 * THE RACE THIS SCREEN EXISTS TO HANDLE: availability was computed when the
 * customer reached the slot step; the slot is only actually claimed here, at
 * POST time. Between those two moments somebody else can take it, and the
 * backend will (correctly, and provably — it is what its transaction test suite
 * enforces) reject this booking with
 * `{ success: false, message: "This slot is no longer available." }`.
 *
 * That is a normal Tuesday, not an exception. So the failure renders as an
 * inline notice with the API's own wording — never reworded, never branched on —
 * above a one-tap route back to the time grid, which refetches availability and
 * shows the slot correctly greyed out. The confirm button also stays live, so a
 * genuinely transient failure can simply be retried.
 */

function SummaryRow({
  label,
  value,
  onChange,
  changeLabel,
}: {
  label: string;
  value: ReactNode;
  onChange?: () => void;
  changeLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="flex min-w-0 items-baseline gap-3 text-right">
        <span className="min-w-0 break-words text-sm font-semibold text-primary">
          {value}
        </span>
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            className="shrink-0 text-sm font-semibold text-secondary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            {changeLabel ?? "Change"}
          </button>
        )}
      </dd>
    </div>
  );
}

export interface ConfirmationSummaryProps {
  onNavigate: (step: BookingStep) => void;
}

export function ConfirmationSummary({ onNavigate }: ConfirmationSummaryProps) {
  const router = useRouter();
  const {
    service,
    barber,
    isAnyBarber,
    barberSelection,
    date,
    slot,
    customer,
    setConfirmedAppointment,
  } = useBooking();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // The step router only reaches this screen once every prerequisite is set;
  // this guard keeps TypeScript honest and covers a stray direct render.
  if (!service || !barberSelection || !date || !slot) {
    return (
      <StepShell
        title="Confirm booking"
        description="Some details are missing. Let's go back and finish them."
      >
        <Button onClick={() => onNavigate("service")}>Start again</Button>
      </StepShell>
    );
  }

  async function handleConfirm() {
    if (!service || !barberSelection || !date || !slot) return;

    const payload: CreateAppointmentPayload = {
      serviceId: service.id,
      barberId: barberSelection,
      date,
      startTime: slot.start,
      customerName: customer.name.trim(),
      customerPhone: customer.phone.trim(),
    };
    const email = customer.email.trim();
    if (email) payload.customerEmail = email;
    const notes = customer.notes.trim();
    if (notes) payload.notes = notes;

    // Last line of defence before the network: a half-built wizard state must
    // never reach the API.
    const parsed = createAppointmentSchema.safeParse(payload);
    if (!parsed.success) {
      setFailure(
        parsed.error.issues[0]?.message ??
          "Some booking details are incomplete. Please check the steps above.",
      );
      return;
    }

    setIsSubmitting(true);
    setFailure(null);

    try {
      const result = await createAppointment(payload);

      if (result.success) {
        setConfirmedAppointment(result.appointment);
        router.push("/book/confirmation");
        return;
      }

      // Business failure (slot taken, validation rejected server-side, …).
      // Render the API's message verbatim.
      setFailure(result.message);
    } catch (error) {
      setFailure(
        isApiError(error)
          ? error.message
          : "We couldn't reach the salon just now. Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const barberName = isAnyBarber ? "Any barber" : (barber?.name ?? "—");

  return (
    <StepShell
      title="Confirm booking"
      description="Check everything over, then confirm. Your slot is held only once you confirm."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Appointment
          </h3>
          <dl className="mt-2">
            <SummaryRow
              label="Service"
              value={service.name}
              onChange={() => onNavigate("service")}
            />
            <SummaryRow
              label="Barber"
              value={barberName}
              onChange={() => onNavigate("barber")}
            />
            <SummaryRow
              label="Date"
              value={formatDateLong(date)}
              onChange={() => onNavigate("date")}
            />
            <SummaryRow
              label="Time"
              value={`${formatTime12h(slot.start)} – ${formatTime12h(slot.end)}`}
              onChange={() => onNavigate("slot")}
            />
            <SummaryRow
              label="Duration"
              value={formatDuration(service.durationMinutes)}
            />
          </dl>

          <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-500">
            Your details
          </h3>
          <dl className="mt-2">
            <SummaryRow
              label="Name"
              value={customer.name}
              onChange={() => onNavigate("details")}
            />
            <SummaryRow
              label="Phone"
              value={customer.phone}
              onChange={() => onNavigate("details")}
            />
            {customer.email.trim() && (
              <SummaryRow
                label="Email"
                value={customer.email}
                onChange={() => onNavigate("details")}
              />
            )}
            {customer.notes.trim() && (
              <SummaryRow
                label="Notes"
                value={customer.notes}
                onChange={() => onNavigate("details")}
              />
            )}
          </dl>
        </Card>

        <Card className="p-4 sm:p-5 lg:sticky lg:top-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-slate-500">
              Total to pay
            </span>
            <span className="text-2xl font-extrabold text-primary">
              {formatPrice(service.price)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Payable at the salon after your appointment.
          </p>

          {failure && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-danger/30 bg-red-50 p-3"
            >
              <p className="text-sm font-bold text-danger">{failure}</p>
              <p className="mt-1 text-sm text-slate-700">
                Someone may have just booked this time. Pick another one and
                you'll be straight through.
              </p>
              <Button
                variant="outline"
                fullWidth
                className="mt-3"
                onClick={() => onNavigate("slot")}
              >
                Choose another time
              </Button>
            </div>
          )}

          <Button
            size="lg"
            fullWidth
            className="mt-4"
            isLoading={isSubmitting}
            onClick={handleConfirm}
          >
            {failure ? "Try again" : "Confirm booking"}
          </Button>
        </Card>
      </div>
    </StepShell>
  );
}
