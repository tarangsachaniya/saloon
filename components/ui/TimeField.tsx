"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { minutesToTimeString, timeStringToMinutes } from "@/lib/utils/time";

/**
 * `<input type="time">` that speaks the API's units.
 *
 * The API stores every time of day as MINUTES SINCE MIDNIGHT (opening hours,
 * barber working hours, breaks). Asking an admin to type "780" for 1pm would be
 * indefensible, so this component owns the conversion in one place: it renders
 * the native time picker (which localises its own 12h/24h display and gives
 * phones a real time spinner) and emits minutes.
 *
 * An emptied field emits `null` rather than 0 — 0 is a legitimate value
 * (midnight), so the caller has to be able to tell "cleared" from "00:00".
 */

export interface TimeFieldProps {
  /** Minutes since midnight, or null when empty. */
  value: number | null;
  onChange: (minutes: number | null) => void;
  label?: ReactNode;
  error?: string;
  disabled?: boolean;
  /** Snap granularity in minutes for the native stepper. Default 5. */
  stepMinutes?: number;
  className?: string;
  containerClassName?: string;
  "aria-label"?: string;
}

export function TimeField({
  value,
  onChange,
  label,
  error,
  disabled = false,
  stepMinutes = 5,
  className,
  containerClassName,
  "aria-label": ariaLabel,
}: TimeFieldProps) {
  const id = useId();

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", containerClassName)}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-primary">
          {label}
        </label>
      )}
      <input
        id={id}
        type="time"
        disabled={disabled}
        aria-label={label ? undefined : ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        step={stepMinutes * 60}
        value={value === null || !Number.isFinite(value) ? "" : minutesToTimeString(value)}
        onChange={(event) => {
          const raw = event.target.value;
          if (!raw) {
            onChange(null);
            return;
          }
          const minutes = timeStringToMinutes(raw);
          onChange(Number.isFinite(minutes) ? minutes : null);
        }}
        className={cn(
          "w-full rounded-lg border bg-surface px-3 py-2.5 text-base text-primary",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-slate-400",
          error
            ? "border-danger focus:border-danger focus:ring-danger/25"
            : "border-slate-300 focus:border-secondary focus:ring-secondary/30",
          className,
        )}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
