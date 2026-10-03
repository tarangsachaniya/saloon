"use client";

import { BOOKING_STEPS, useBooking, type BookingStep } from "@/lib/booking/BookingContext";
import { cn } from "@/lib/utils/cn";

const STEP_LABELS: Record<BookingStep, string> = {
  service: "Service",
  barber: "Stylist",
  date: "Date",
  slot: "Time",
  details: "Details",
  confirm: "Confirm",
};

const STEP_HEADINGS: Record<BookingStep, string> = {
  service: "Choose a service",
  barber: "Choose a stylist",
  date: "Choose a date",
  slot: "Choose a time",
  details: "Your details",
  confirm: "Confirm booking",
};

export interface BookingStepperProps {
  current: BookingStep;
  onNavigate: (step: BookingStep) => void;
  onBack?: () => void;
}

export function BookingStepper({ current, onNavigate, onBack }: BookingStepperProps) {
  const { completedSteps, canGoToStep } = useBooking();
  const currentIndex = BOOKING_STEPS.indexOf(current);
  const progress = ((currentIndex + 1) / BOOKING_STEPS.length) * 100;

  return (
    <nav aria-label="Booking steps" className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
      {/* Header with Step title & Back button */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-primary transition-colors mr-1"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
                aria-hidden
              >
                <path d="M12 4l-5 6 5 6" />
              </svg>
              <span>Back</span>
            </button>
          )}

          <p className="text-sm font-bold text-primary">
            <span className="text-slate-500 font-semibold">
              Step {currentIndex + 1} of {BOOKING_STEPS.length}:
            </span>{" "}
            <span>{STEP_HEADINGS[current]}</span>
          </p>
        </div>

        <span className="text-xs font-bold text-secondary-700 bg-secondary-50 px-2.5 py-0.5 rounded-full ring-1 ring-secondary-200">
          {Math.round(progress)}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={BOOKING_STEPS.length}
        aria-valuenow={currentIndex + 1}
        aria-valuetext={`Step ${currentIndex + 1} of ${BOOKING_STEPS.length}: ${STEP_HEADINGS[current]}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 mb-4"
      >
        <div
          className="h-full rounded-full bg-secondary transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stepper Steps */}
      <ol className="flex items-center justify-between">
        {BOOKING_STEPS.map((step, index) => {
          const isCurrent = step === current;
          const isDone = completedSteps.has(step) && !isCurrent;
          const reachable = canGoToStep(step);

          return (
            <li
              key={step}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center",
                index > 0 &&
                  "before:absolute before:right-1/2 before:top-4 before:h-0.5 before:w-full before:-translate-y-1/2 before:content-['']",
                index > 0 &&
                  (completedSteps.has(BOOKING_STEPS[index - 1])
                    ? "before:bg-secondary"
                    : "before:bg-slate-200"),
              )}
            >
              <button
                type="button"
                onClick={() => onNavigate(step)}
                disabled={!reachable}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${STEP_HEADINGS[step]}${
                  isDone ? " (completed)" : ""
                }`}
                className="relative z-10 p-1 disabled:cursor-not-allowed group focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                    isCurrent &&
                      "bg-primary text-white ring-4 ring-primary/20 shadow-sm scale-110",
                    isDone && "bg-secondary text-white ring-2 ring-secondary/30",
                    !isCurrent &&
                      !isDone &&
                      reachable &&
                      "bg-slate-100 text-slate-700 hover:bg-slate-200 ring-1 ring-slate-200",
                    !isCurrent &&
                      !isDone &&
                      !reachable &&
                      "bg-slate-50 text-slate-400 ring-1 ring-slate-200",
                  )}
                >
                  {isDone ? (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden
                    >
                      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
              </button>

              <span
                aria-hidden
                className={cn(
                  "hidden max-w-full truncate px-1 text-[11px] font-bold mt-1 sm:block transition-colors",
                  isCurrent ? "text-primary" : isDone ? "text-secondary-700" : "text-slate-400",
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { STEP_HEADINGS, STEP_LABELS };
