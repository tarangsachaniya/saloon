"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookingStepper,
  BarberSelector,
  ConfirmationSummary,
  CustomerDetailsForm,
  DateSelector,
  ServiceSelector,
  SlotGrid,
} from "@/components/booking";
import { Loader } from "@/components/ui";
import { getBarbers, getServices } from "@/lib/api";
import { useSalon } from "@/lib/salon/SalonContext";
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
  const { completedSteps, canGoToStep, selectServices, selectBarber } = useBooking();
  const { slug } = useSalon();
  const [step, setStep] = useState<BookingStep>("service");
  // "Book again" arrives as ?serviceId=&barberId=. Both are re-fetched from the
  // salon's CURRENT catalogue (never trusted from the link) and only applied
  // if still valid; anything else falls back to letting the customer choose.
  const [preparing, setPreparing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const prefillStarted = useRef(false);
  const wizardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef<BookingStep>(step);
  const reduceMotion = useReducedMotion();

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

  useEffect(() => {
    if (prefillStarted.current) return;
    prefillStarted.current = true;
    const params = new URLSearchParams(window.location.search);
    // `serviceIds=a,b` (multi-service) or the older single `serviceId=`.
    const wanted = (params.get("serviceIds") ?? params.get("serviceId") ?? "").split(",").filter(Boolean);
    const barberId = params.get("barberId");
    if (wanted.length === 0) return;
    setPreparing(true);

    (async () => {
      try {
        const all = await getServices(slug);
        const services = wanted.map((id) => all.find((s) => s.id === id));
        if (services.some((s) => !s)) {
          setNotice("A service from that booking isn't available any more. Please choose again.");
          return;
        }
        selectServices(services as typeof all);
        const barber = barberId
          ? (await getBarbers(slug, wanted)).find((b) => b.id === barberId)
          : undefined;
        if (barber) {
          selectBarber(barber);
          setStep("date");
        } else {
          if (barberId) setNotice("Your previous barber isn't available for this service. Please choose another.");
          setStep("barber");
        }
      } catch {
        setNotice("We couldn't load your previous booking. Please choose a service.");
      } finally {
        setPreparing(false);
      }
    })();
  }, [slug, selectServices, selectBarber]);

  const navigate = useCallback((target: BookingStep) => setStep(target), []);

  /*
   * Scroll + focus on a step change, from ONE place (an effect on `step`) so a
   * step can never scroll twice however it was reached (card tap, stepper,
   * Back, "Change" link, or the clamp effect walking the step back).
   *
   * The target is the top of the wizard - the progress bar - not the top of the
   * document, so the salon header is only left behind when it is actually in
   * the way. If the wizard's top is already comfortably in view (typical on
   * desktop) nothing moves at all. Smooth unless the visitor prefers reduced
   * motion; a wheel/touch scroll by the user cancels a smooth scroll natively.
   */
  useEffect(() => {
    if (previousStep.current === step) return; // first render / clamp no-op
    previousStep.current = step;

    const frame = requestAnimationFrame(() => {
      const wizard = wizardRef.current;
      if (wizard) {
        const top = wizard.getBoundingClientRect().top;
        if (top < 0 || top > 160) {
          wizard.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      }
      // Keyboard / screen-reader users land on the new step, without a second scroll.
      contentRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [step, reduceMotion]);

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
  const backStep = stepIndex > 0 ? BOOKING_STEPS[stepIndex - 1] : null;

  return (
    <div ref={wizardRef} className="mx-auto flex w-full max-w-4xl scroll-mt-4 flex-col gap-6">
      {notice && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-warning">
          {notice}
        </p>
      )}

      <BookingStepper
        current={step}
        onNavigate={goTo}
        onBack={backStep ? () => goTo(backStep) : undefined}
      />

      {preparing ? (
        <Loader label="Preparing your booking…" />
      ) : (
        // Keyed by step: a short fade/slide on change (no exit phase, so it never delays the next screen).
      <motion.div
        key={step}
        ref={contentRef}
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full min-w-0 focus:outline-none"
      >
        {step === "service" && <ServiceSelector onSelected={advance} />}
        {step === "barber" && <BarberSelector onSelected={advance} />}
        {step === "date" && <DateSelector onSelected={advance} />}
        {step === "slot" && (
          <SlotGrid onSelected={advance} onChangeDate={() => goTo("date")} />
        )}
        {step === "details" && <CustomerDetailsForm onSubmitted={advance} />}
        {step === "confirm" && <ConfirmationSummary onNavigate={goTo} />}
      </motion.div>
      )}
    </div>
  );
}
