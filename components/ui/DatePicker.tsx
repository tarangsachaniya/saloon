"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  addDays,
  formatDateLong,
  fromDateString,
  isSameDay,
  startOfToday,
  toDateString,
} from "@/lib/utils/time";
import type { DateString } from "@/lib/booking/types";

/**
 * Lightweight calendar — a hand-rolled month grid, deliberately free of any
 * date library (the legacy app pulled in dayjs + MUI x-date-pickers for this).
 *
 * All comparisons run in LOCAL time via `lib/utils/time.ts`, never
 * `toISOString()`, so the selected day cannot shift across a timezone boundary.
 */

const WEEKDAY_INITIALS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface CalendarProps {
  /** Currently selected date, "YYYY-MM-DD". */
  value?: DateString | null;
  onChange?: (date: DateString) => void;
  /** Earliest selectable day (inclusive). Defaults to today. */
  minDate?: Date;
  /** Latest selectable day (inclusive). Map from `maximumAdvanceBookingDays`. */
  maxDate?: Date;
  /**
   * Extra per-day predicate — return true to disable. Use for salon closed
   * days (`OpeningHour.isOpen === false`).
   */
  isDateDisabled?: (date: Date) => boolean;
  /** 0 = Sunday, 1 = Monday. Defaults to Monday. */
  weekStartsOn?: 0 | 1;
  className?: string;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  isDateDisabled,
  weekStartsOn = 1,
  className,
}: CalendarProps) {
  const today = useMemo(() => startOfToday(), []);
  const min = useMemo(() => stripTime(minDate ?? today), [minDate, today]);
  const max = useMemo(() => (maxDate ? stripTime(maxDate) : null), [maxDate]);

  const selectedDate = useMemo(
    () => (value ? fromDateString(value) : null),
    [value],
  );

  // The month on screen. Opens on the selection when there is one.
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(selectedDate ?? min),
  );

  const weekdayLabels = useMemo(() => {
    return Array.from(
      { length: 7 },
      (_, i) => WEEKDAY_INITIALS[(i + weekStartsOn) % 7],
    );
  }, [weekStartsOn]);

  const days = useMemo(() => {
    const first = startOfMonth(viewMonth);
    // How many blank cells before the 1st, given the week start.
    const lead = (first.getDay() - weekStartsOn + 7) % 7;
    const daysInMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + 1,
      0,
    ).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < lead; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    // Pad to a whole number of weeks so the grid height stays stable.
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth, weekStartsOn]);

  function isDisabled(date: Date): boolean {
    if (date < min) return true;
    if (max && date > max) return true;
    return isDateDisabled?.(date) ?? false;
  }

  const canGoPrev = useMemo(() => {
    const prevMonthEnd = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      0,
    );
    return prevMonthEnd >= min;
  }, [viewMonth, min]);

  const canGoNext = useMemo(() => {
    if (!max) return true;
    return addMonths(viewMonth, 1) <= max;
  }, [viewMonth, max]);

  return (
    <div className={cn("w-full max-w-sm select-none", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M12 4l-5 6 5 6" />
          </svg>
        </button>

        <p aria-live="polite" className="text-sm font-bold text-primary sm:text-base">
          {viewMonth.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </p>

        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          disabled={!canGoNext}
          aria-label="Next month"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M8 4l5 6-5 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label, i) => (
          <div
            key={`${label}-${i}`}
            aria-hidden
            className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {label}
          </div>
        ))}

        {days.map((date, index) => {
          if (!date) return <div key={`blank-${index}`} aria-hidden />;

          const disabled = isDisabled(date);
          const selected = selectedDate ? isSameDay(date, selectedDate) : false;
          const isToday = isSameDay(date, today);

          return (
            <button
              key={toDateString(date)}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-current={isToday ? "date" : undefined}
              aria-label={formatDateLong(date)}
              onClick={() => onChange?.(toDateString(date))}
              className={cn(
                // aspect-square keeps touch targets ~44px at 375px width.
                "flex aspect-square items-center justify-center rounded-lg text-sm font-medium",
                "transition-colors duration-100",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-secondary",
                disabled &&
                  "cursor-not-allowed text-slate-300 line-through decoration-slate-300",
                !disabled &&
                  !selected &&
                  "text-primary hover:bg-secondary-50 hover:text-secondary-700",
                selected &&
                  "bg-primary font-bold text-primary-foreground hover:bg-primary-600",
                !selected && isToday && !disabled && "ring-1 ring-inset ring-secondary",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface DatePickerProps extends CalendarProps {
  /** Text shown when nothing is selected. */
  placeholder?: string;
  label?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  triggerClassName?: string;
  containerClassName?: string;
  /**
   * How the chosen date is rendered on the trigger. Defaults to
   * `formatDateLong`, which honours the visitor's own locale — right for the
   * customer-facing booking flow.
   *
   * Added in M6 so the admin screens can pass their own locale-INDEPENDENT
   * formatter (`lib/admin/format.ts`) and not show two different spellings of
   * the same date in one dialog. Purely additive: every existing caller keeps
   * the previous behaviour.
   */
  formatValue?: (date: DateString) => string;
}

/** Calendar in a popover, with a field-style trigger matching `Input`. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Choose a date",
  label,
  error,
  disabled,
  triggerClassName,
  containerClassName,
  formatValue = formatDateLong,
  ...calendarProps
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("flex w-full flex-col gap-1.5", containerClassName)}>
      {label && (
        <span className="text-sm font-semibold text-primary">{label}</span>
      )}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            className={cn(
              "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3.5 py-2.5",
              "text-left text-base transition-colors duration-150",
              "focus:outline-none focus:ring-2",
              "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-slate-500",
              error
                ? "border-danger focus:border-danger focus:ring-danger/25"
                : "border-slate-300 focus:border-secondary focus:ring-secondary/30",
              value ? "text-primary" : "text-slate-400",
              triggerClassName,
            )}
          >
            {value ? formatValue(value) : placeholder}
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="h-4 w-4 shrink-0 text-slate-500"
              aria-hidden
            >
              <rect x="3" y="4.5" width="14" height="13" rx="2" />
              <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
            </svg>
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className={cn(
              "z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-card border border-slate-200 bg-surface p-3 shadow-card-hover",
              "data-[state=open]:animate-slide-down",
            )}
          >
            <Calendar
              value={value}
              onChange={(date) => {
                onChange?.(date);
                setOpen(false);
              }}
              {...calendarProps}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Helper: the latest bookable date from `SalonSettings.maximumAdvanceBookingDays`.
 */
export function maxBookableDate(maximumAdvanceBookingDays: number): Date {
  return addDays(startOfToday(), maximumAdvanceBookingDays);
}
