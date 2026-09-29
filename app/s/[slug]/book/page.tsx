"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookingStepper,
  BarberSelector,
  ConfirmationSummary,
  CustomerDetailsForm,
  DateSelector,
  ServiceSelector,
  SlotGrid,
} from "@/components/booking";
import { Button } from "@/components/ui";
import {
  BOOKING_STEPS,
  useBooking,
  type BookingStep,
} from "@/lib/booking/BookingContext";

/**
 * The booking wizard shell and step router.
 *
 * DESIGN CALL — the current step is tracked EXPLICITLY here rather than derived
 * as "the first incomplete step". Deriving it would make backward navigation
 * impossible: the moment the customer stepped back to change their service, the
 * derivation would bounce them straight forward again to the first gap. So:
 *
 *   - `step` is local state, advanced by each step component's callback.
 *   - Backward navigation is free (an earlier step is always reachable once its
 *     prerequisites hold, which they do by definition if you got past it).
 *   - Forward navigation is gated by the context's `canGoToStep`, enforced both
 *     in `BookingStepper` (the control is disabled) and by the clamp below.
 *
 * The clamp matters because every selection invalidates what follows it: change
 * the service and the context clears barber/date/slot, which can strand `step`
 * on a screen whose data no longer exists. The effect walks it back to the
 * first incomplete step instead of rendering a broken screen.
 */
export default function BookPage() {
  const { completedSteps, canGoToStep } = useBooking();
  const [step, setStep] = useState<BookingStep>("service");

  useEffect(() => {
    const firstIncomplete = BOOKING_STEPS.findIndex(
      (candidate) => !completedSteps.has(candidate),
    );
    const furthest =
      firstIncomplete === -1 ? BOOKING_STEPS.length - 1 : firstIncomplete;

    setStep((current) =>
      BOOKING_STEPS.indexOf(current) > furthest
        ? BOOKING_STEPS[furthest]
        : current,
    );
  }, [completedSteps]);

  const navigate = useCallback((target: BookingStep) => {
    setStep(target);
    // A step change is a screen change; on a phone the new heading is otherwise
    // below the fold after a long slot grid.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  /** Jump to an arbitrary step (stepper, "change" links) — gated. */
  const goTo = useCallback(
    (target: BookingStep) => {
      if (!canGoToStep(target)) return;
      navigate(target);
    },
    [canGoToStep, navigate],
  );

  /**
   * Move to the next step after a step component made its selection.
   *
   * Deliberately NOT routed through `goTo`: the selection that unlocks the next
   * step was made in the very same event, so `canGoToStep` — closed over the
   * pre-update context value — would still report the next step as unreachable
   * and silently swallow the advance. The clamp effect above is what keeps this
   * honest if a selection ever fails to land.
   */
  const advance = useCallback(() => {
    const next = BOOKING_STEPS[BOOKING_STEPS.indexOf(step) + 1];
    if (next) navigate(next);
  }, [step, navigate]);

  const stepIndex = BOOKING_STEPS.indexOf(step);
  const previousStep = stepIndex > 0 ? BOOKING_STEPS[stepIndex - 1] : null;

  return (
    <div className="mx-auto w-full max-w-4xl flex flex-col gap-6">
      <BookingStepper
        current={step}
        onNavigate={goTo}
        onBack={previousStep ? () => goTo(previousStep) : undefined}
      />

      <div className="w-full">
        {step === "service" && <ServiceSelector onSelected={advance} />}
        {step === "barber" && <BarberSelector onSelected={advance} />}
        {step === "date" && <DateSelector onSelected={advance} />}
        {step === "slot" && (
          <SlotGrid onSelected={advance} onChangeDate={() => goTo("date")} />
        )}
        {step === "details" && <CustomerDetailsForm onSubmitted={advance} />}
        {step === "confirm" && <ConfirmationSummary onNavigate={goTo} />}
      </div>
    </div>
  );
}
