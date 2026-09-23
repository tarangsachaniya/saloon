"use client";

import { Button, TimeField, Toggle } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { WEEKDAY_LABELS } from "@/lib/utils/time";

/**
 * The seven-row weekly hours grid, shared by the barber schedule editor
 * (`isWorking`/`startTime`/`endTime`) and the salon's own opening hours
 * (`isOpen`/`openTime`/`closeTime`).
 *
 * WHY SHARED: the two APIs disagree only on field NAMES — the interaction is
 * identical (toggle a day on/off, pick a start and an end, repeat seven times),
 * and so are the traps: minutes-since-midnight on the wire, a "cleared" field
 * that is not the same as midnight, and the fact that a day the toggle is OFF
 * must still carry times so turning it back on does not hand the API a null.
 * Solving that twice would guarantee the two drift.
 *
 * The neutral row shape (`enabled`/`start`/`end`) is what makes one component
 * serve both; each caller maps its own field names in and out with the two
 * helpers below.
 *
 * A row's times are KEPT when it is toggled off. The API is sent 0/0 for a
 * closed day (matching how the backend seeds Sunday), but the admin's typed
 * values stay on screen so an accidental toggle is not destructive.
 */

export interface WeeklyHoursRow {
  /** 0 = Sunday … 6 = Saturday, matching the API. */
  weekday: number;
  /** "Working" for a barber, "Open" for the salon. */
  enabled: boolean;
  /** Minutes since midnight, or null while the field is empty. */
  start: number | null;
  end: number | null;
}

/**
 * Display order. The API indexes weekdays from Sunday, but a salon week reads
 * Monday-first, so the rows are REORDERED for display only — `row.weekday`
 * stays the API's own number.
 */
export const WEEK_DISPLAY_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

/** 10:00 — the seeded salon's weekday opening, and a sane default for a new row. */
export const DEFAULT_START_MINUTES = 600;
/** 20:00 */
export const DEFAULT_END_MINUTES = 1200;

/** Seven rows, all switched off, ready for a brand-new barber. */
export function defaultWeeklyRows(enabled = false): WeeklyHoursRow[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: enabled && weekday !== 0,
    start: DEFAULT_START_MINUTES,
    end: DEFAULT_END_MINUTES,
  }));
}

/**
 * Build the seven rows from an API array that may be SPARSE.
 *
 * This is not defensive padding — `GET /api/barbers/:id` genuinely returns only
 * the weekdays a barber works (Akash in the seed has five rows, not seven). A
 * naive `map` would render a five-row week and, worse, silently drop the two
 * missing days from the replace-everything write that follows.
 */
export function weeklyRowsFrom<T>(
  source: readonly T[] | undefined | null,
  read: (row: T) => { weekday: number; enabled: boolean; start: number; end: number },
): WeeklyHoursRow[] {
  const rows = defaultWeeklyRows();
  for (const item of source ?? []) {
    const parsed = read(item);
    if (parsed.weekday < 0 || parsed.weekday > 6) continue;
    rows[parsed.weekday] = {
      weekday: parsed.weekday,
      enabled: parsed.enabled,
      // A closed day is stored as 0/0; showing "12:00 AM – 12:00 AM" in a
      // disabled field is noise, so fall back to the defaults for display.
      start: parsed.enabled || parsed.start > 0 ? parsed.start : DEFAULT_START_MINUTES,
      end: parsed.enabled || parsed.end > 0 ? parsed.end : DEFAULT_END_MINUTES,
    };
  }
  return rows;
}

export interface WeeklyHoursEditorProps {
  rows: WeeklyHoursRow[];
  onChange: (rows: WeeklyHoursRow[]) => void;
  /** Switch label for an active day — "Working" or "Open". */
  enabledLabel: string;
  /** Muted caption for an inactive day — "Day off" or "Closed". */
  disabledLabel: string;
  /** Validation messages keyed by weekday number. */
  errors?: Partial<Record<number, string>>;
  disabled?: boolean;
}

export function WeeklyHoursEditor({
  rows,
  onChange,
  enabledLabel,
  disabledLabel,
  errors,
  disabled = false,
}: WeeklyHoursEditorProps) {
  function patch(weekday: number, changes: Partial<WeeklyHoursRow>) {
    onChange(
      rows.map((row) => (row.weekday === weekday ? { ...row, ...changes } : row)),
    );
  }

  /** Copy the first active day's times onto every other active day. */
  function copyToAll() {
    const template = rows.find((row) => row.enabled);
    if (!template) return;
    onChange(
      rows.map((row) =>
        row.enabled ? { ...row, start: template.start, end: template.end } : row,
      ),
    );
  }

  const activeCount = rows.filter((row) => row.enabled).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {activeCount === 0
            ? `No days set as ${enabledLabel.toLowerCase()}.`
            : `${activeCount} of 7 days ${enabledLabel.toLowerCase()}.`}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToAll}
          disabled={disabled || activeCount < 2}
        >
          Copy first day&rsquo;s times to all
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {WEEK_DISPLAY_ORDER.map((weekday) => {
          const row = rows[weekday];
          if (!row) return null;
          const error = errors?.[weekday];

          return (
            <li
              key={weekday}
              className={cn(
                "rounded-lg border px-3 py-2.5",
                error ? "border-danger/40 bg-red-50/40" : "border-slate-200 bg-surface",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-[8.5rem] flex-1">
                  <Toggle
                    checked={row.enabled}
                    onCheckedChange={(checked) => patch(weekday, { enabled: checked })}
                    disabled={disabled}
                    label={WEEKDAY_LABELS[weekday]}
                    description={row.enabled ? enabledLabel : disabledLabel}
                    block
                  />
                </div>

                <div className="flex items-center gap-2">
                  <TimeField
                    value={row.start}
                    onChange={(minutes) => patch(weekday, { start: minutes })}
                    disabled={disabled || !row.enabled}
                    aria-label={`${WEEKDAY_LABELS[weekday]} start time`}
                    containerClassName="w-[8.5rem]"
                    className="py-2"
                  />
                  <span aria-hidden className="text-sm text-slate-400">
                    to
                  </span>
                  <TimeField
                    value={row.end}
                    onChange={(minutes) => patch(weekday, { end: minutes })}
                    disabled={disabled || !row.enabled}
                    aria-label={`${WEEKDAY_LABELS[weekday]} end time`}
                    containerClassName="w-[8.5rem]"
                    className="py-2"
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-1.5 text-sm font-semibold text-danger">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Turn the editor's rows back into the API's units.
 *
 * A row that is off, or whose fields were cleared, is sent as 0/0 rather than
 * null: the columns are non-nullable ints server-side, and 0/0 is exactly what
 * the backend seeds for the salon's closed Sunday.
 */
export function weeklyRowToMinutes(row: WeeklyHoursRow): {
  start: number;
  end: number;
} {
  if (!row.enabled) return { start: 0, end: 0 };
  return {
    start: row.start ?? 0,
    end: row.end ?? 0,
  };
}
