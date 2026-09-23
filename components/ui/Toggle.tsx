"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A boolean switch.
 *
 * Built on a real `<button role="switch">` rather than a styled checkbox: the
 * admin screens toggle things that take effect on save (is this barber working
 * on Tuesday? is the salon open on Sunday?) and a switch reads as a state, not
 * as a list selection. Screen readers get the state from `aria-checked`, and
 * the whole row is clickable so it stays usable at the front desk on a phone.
 */

export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Visible label. Omit and pass `aria-label` for an icon-only switch. */
  label?: ReactNode;
  /** Small muted line under the label. */
  description?: ReactNode;
  disabled?: boolean;
  /** Renders label and switch on one justified row (the default is inline). */
  block?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  block = false,
  className,
  "aria-label": ariaLabel,
}: ToggleProps) {
  const id = useId();

  const control = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? `${id}-label` : undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent",
        "transition-colors duration-150",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-secondary" : "bg-slate-300",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow",
          "transition-transform duration-150",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );

  if (!label) {
    return <span className={className}>{control}</span>;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        block && "w-full justify-between",
        className,
      )}
    >
      <label
        id={`${id}-label`}
        htmlFor={id}
        className={cn(
          "min-w-0 cursor-pointer select-none text-sm font-semibold text-primary",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {label}
        {description && (
          <span className="mt-0.5 block text-xs font-normal text-slate-500">
            {description}
          </span>
        )}
      </label>
      {control}
    </div>
  );
}
