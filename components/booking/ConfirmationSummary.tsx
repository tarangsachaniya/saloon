"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { createAppointment, isApiError } from "@/lib/api";
import { useBooking, type BookingStep } from "@/lib/booking/BookingContext";
import { useSalon } from "@/lib/salon/SalonContext";
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
  const { slug } = useSalon();
  const {
    service,
    services,
    serviceIds,
    barber,
    isAnyBarber,
    barberSelection,
    date,
    slot,
    customer,
    setConfirmedAppointment,
  } = useBooking();

  const [isSubmitting, setIsSubmitting] = useState(false);
  // The failure worth a "choose another time" nudge: the slot/selection was
  // rejected (4xx), as opposed to a dropped connection or a server fault.
  const [failure, setFailure] = useState<{ message: string; slotProblem: boolean } | null>(null);
  // Synchronous guard: `isSubmitting` state only updates on the next render, so
  // a fast double tap could otherwise fire two POSTs (the second would then be
  // rejected as "slot taken" even though the first succeeded).
  const inFlight = useRef(false);

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
    if (inFlight.current) return;
    if (!service || !barberSelection || !date || !slot) return;
    if (!customer.consent) {
      setFailure({ message: "Please agree to the privacy terms to book.", slotProblem: false });
      return;
    }

    const payload: CreateAppointmentPayload = {
      serviceIds,
      barberId: barberSelection,
      date,
      startTime: slot.start,
      customerName: customer.name.trim(),
      customerPhone: customer.phone.trim(),
      consent: true,
      marketingOptIn: customer.marketingOptIn,
    };
    const email = customer.email.trim();
    if (email) payload.customerEmail = email;
    const notes = customer.notes.trim();
    if (notes) payload.notes = notes;

    // Last line of defence before the network: a half-built wizard state must
    // never reach the API.
    const parsed = createAppointmentSchema.safeParse(payload);
    if (!parsed.success) {
      setFailure({
        message:
          parsed.error.issues[0]?.message ??
          "Some booking details are incomplete. Please check the steps above.",
        slotProblem: false,
      });
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);
    setFailure(null);

    try {
      const result = await createAppointment(slug, payload);

      if (result.success) {
        setConfirmedAppointment(result.appointment);
        router.push(`/s/${slug}/book/confirmation`);
        return;
      }

      // Business failure (slot taken, an option that is no longer offered, …).
      // The API's message is written for customers; show it as is. The time
      // step refetches on revisit and drops the slot if it is really gone
      // (see SlotGrid), so no dead selection survives.
      setFailure({ message: result.message, slotProblem: true });
    } catch (error) {
      const network = isApiError(error) && error.isNetworkError;
      setFailure({
        message: network
          ? "We couldn't reach the salon just now. Please check your connection and try again."
          : "We couldn't complete your booking. Please try again in a moment.",
        slotProblem: false,
      });
    } finally {
      inFlight.current = false;
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
              label={services.length > 1 ? `Services (${services.length})` : "Service"}
              value={
                services.length > 1 ? (
                  <span className="flex flex-col gap-0.5">
                    {services.map((s) => (
                      <span key={s.id}>
                        {s.name} · {formatPrice(s.price)}
                      </span>
                    ))}
                  </span>
                ) : (
                  service.name
                )
              }
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
              <p className="text-sm font-bold text-danger">{failure.message}</p>
              {failure.slotProblem && (
                <>
                  <p className="mt-1 text-sm text-slate-700">
                    Someone may have just booked this time. Pick another one and
                    you&apos;ll be straight through.
                  </p>
                  <Button
                    variant="outline"
                    fullWidth
                    className="mt-3"
                    onClick={() => onNavigate("slot")}
                  >
                    Choose another time
                  </Button>
                </>
              )}
            </div>
          )}

          <Button
            size="lg"
            fullWidth
            className="mt-4"
            isLoading={isSubmitting}
            onClick={handleConfirm}
          >
            {failure && !failure.slotProblem ? "Try again" : "Confirm booking"}
          </Button>
        </Card>
      </div>
    </StepShell>
  );
}
