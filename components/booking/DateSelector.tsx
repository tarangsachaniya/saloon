"use client";

import { useMemo } from "react";
import { getSettings } from "@/lib/api";
import { useBooking } from "@/lib/booking/BookingContext";
import type { DateString } from "@/lib/booking/types";
import { Calendar, Card, Loader, maxBookableDate } from "@/components/ui";
import {
  formatDateLong,
  formatTime12h,
  startOfToday,
  WEEKDAY_LABELS,
} from "@/lib/utils/time";
import { StepError, StepShell } from "./StepShell";
import { useAsync } from "./useAsync";

/**
 * Step 3 — pick a date.
 *
 * DESIGN CALLS:
 *  - The `Calendar` is rendered inline rather than inside the `DatePicker`
 *    popover. In a wizard the calendar *is* the step, and a popover adds a tap
 *    and an overlay that behaves badly on small screens.
 *  - Bounds come straight from `SalonSettings`: `minDate` is today and
 *    `maxDate` is `maxBookableDate(maximumAdvanceBookingDays)` (the helper the
 *    UI kit exports for exactly this).
 *  - Days the salon is shut that weekday are disabled via `isDateDisabled`,
 *    cross-referencing `openingHours[].isOpen`. Disabling by WEEKDAY only is
 *    deliberate: a one-off barber day-off is not visible on the public API, and
 *    guessing would grey out dates that are in fact bookable with another
 *    barber. Those surface honestly at the next step as "no times available".
 */

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function DateSelector({ onSelected }: { onSelected: () => void }) {
  const { date: selected, selectDate } = useBooking();
  const { data: settings, error, isLoading, reload } = useAsync(
    (signal) => getSettings({ signal }),
    [],
  );

  const closedWeekdays = useMemo(() => {
    const closed = new Set<number>();
    for (const hour of settings?.openingHours ?? []) {
      if (!hour.isOpen) closed.add(hour.weekday);
    }
    return closed;
  }, [settings]);

  const openingRows = useMemo(() => {
    const byWeekday = new Map(
      (settings?.openingHours ?? []).map((hour) => [hour.weekday, hour]),
    );
    return WEEKDAY_ORDER.map((weekday) => ({
      weekday,
      label: WEEKDAY_LABELS[weekday],
      hour: byWeekday.get(weekday),
    }));
  }, [settings]);

  function choose(date: DateString) {
    selectDate(date);
    onSelected();
  }

  return (
    <StepShell
      title="Choose a date"
      description={
        settings
          ? `You can book up to ${settings.maximumAdvanceBookingDays} days ahead. Closed days are crossed out.`
          : undefined
      }
    >
      {isLoading && <Loader label="Loading the calendar…" />}

      {error && <StepError message={error} onRetry={reload} />}

      {settings && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <Card className="p-3 sm:p-4">
            <Calendar
              className="mx-auto"
              value={selected}
              onChange={choose}
              minDate={startOfToday()}
              maxDate={maxBookableDate(settings.maximumAdvanceBookingDays)}
              isDateDisabled={(date) => closedWeekdays.has(date.getDay())}
            />
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Opening hours
            </h3>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-1">
              {openingRows.map(({ weekday, label, hour }) => (
                <div
                  key={weekday}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <dt className="font-semibold text-primary">{label}</dt>
                  <dd
                    className={
                      hour?.isOpen ? "text-slate-600" : "text-slate-400"
                    }
                  >
                    {hour?.isOpen
                      ? `${formatTime12h(hour.openTime)} – ${formatTime12h(hour.closeTime)}`
                      : "Closed"}
                  </dd>
                </div>
              ))}
            </dl>

            {selected && (
              <p className="mt-4 rounded-lg bg-secondary-50 px-3 py-2 text-sm font-semibold text-secondary-700">
                Selected: {formatDateLong(selected)}
              </p>
            )}
          </Card>
        </div>
      )}
    </StepShell>
  );
}
