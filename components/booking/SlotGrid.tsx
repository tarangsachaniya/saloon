"use client";

import { getAvailability } from "@/lib/api";
import { useBooking } from "@/lib/booking/BookingContext";
import { useSalon } from "@/lib/salon/SalonContext";
import type { AvailabilityResponse, Slot } from "@/lib/booking/types";
import { Button, EmptyState, Loader } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatDateLong, formatDuration, formatTime12h } from "@/lib/utils/time";
import { StepError, StepShell } from "./StepShell";
import { useAsync } from "./useAsync";

/**
 * Step 4 — pick a start time.
 *
 * The backend encodes two distinct ideas and this grid preserves both rather
 * than collapsing them:
 *
 *   - A time MISSING from `slots` means the service duration would not fit
 *     before closing (or before the barber's shift ends). It is not rendered,
 *     because offering it would be a lie — a caption explains the gap.
 *   - A time PRESENT with `available: false` means that window exists but is
 *     taken, on a break, or inside the minimum-advance-booking window. It is
 *     rendered greyed out and non-clickable, so the customer can see the shape
 *     of the day (the seeded 13:00–14:00 lunch break reads clearly as a block
 *     of unavailable times rather than as missing data).
 */

export interface SlotGridProps {
  onSelected: () => void;
  /** Send the customer back to the date step from the empty state. */
  onChangeDate: () => void;
}

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: Slot;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = formatTime12h(slot.start);

  return (
    <button
      type="button"
      disabled={!slot.available}
      aria-pressed={slot.available ? selected : undefined}
      aria-label={
        slot.available
          ? `${label} – ${formatTime12h(slot.end)}`
          : `${label}, unavailable`
      }
      onClick={onSelect}
      className={cn(
        // min-h-11 keeps every target at/above the 44px mobile minimum.
        "flex min-h-11 w-full items-center justify-center rounded-lg px-1 py-2",
        "text-sm font-semibold tabular-nums transition-colors duration-150",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        !slot.available &&
          "cursor-not-allowed border border-dashed border-slate-200 bg-slate-50 text-slate-400 line-through",
        slot.available &&
          !selected &&
          "border border-slate-300 bg-surface text-primary hover:border-secondary hover:bg-secondary-50 hover:text-secondary-700",
        selected &&
          "border border-primary bg-primary text-primary-foreground ring-2 ring-primary/25",
      )}
    >
      {label}
    </button>
  );
}

export function SlotGrid({ onSelected, onChangeDate }: SlotGridProps) {
  const { service, barber, isAnyBarber, barberSelection, date, slot: selected, selectSlot } =
    useBooking();
  const { slug } = useSalon();

  const serviceId = service?.id ?? null;

  const { data, error, isLoading, reload } = useAsync<AvailabilityResponse | null>(
    (signal) =>
      serviceId && barberSelection && date
        ? getAvailability(
            slug,
            { serviceId, barberId: barberSelection, date },
            { signal },
          )
        : Promise.resolve(null),
    [slug, serviceId, barberSelection, date],
  );

  function choose(slot: Slot) {
    selectSlot(slot);
    onSelected();
  }

  const slots = data?.slots ?? [];
  const availableCount = slots.filter((s) => s.available).length;
  const who = isAnyBarber ? "any barber" : (barber?.name ?? "your barber");

  return (
    <StepShell
      title="Choose a time"
      description={
        date ? `${formatDateLong(date)} with ${who}.` : undefined
      }
      aside={
        <Button variant="ghost" size="sm" onClick={onChangeDate}>
          Change date
        </Button>
      }
    >
      {isLoading && <Loader label="Checking availability…" />}

      {error && <StepError message={error} onRetry={reload} />}

      {data && slots.length === 0 && (
        <EmptyState
          title="No times available on this day"
          description={
            isAnyBarber
              ? "The salon is closed or fully booked on this date. Try another day."
              : `${who} is not working on this date, or is fully booked. Try another day, or go back and choose a different barber.`
          }
          action={
            <Button variant="outline" onClick={onChangeDate}>
              Pick another date
            </Button>
          }
        />
      )}

      {data && slots.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            <span className="font-bold text-primary">{availableCount}</span>{" "}
            {availableCount === 1 ? "time" : "times"} free
            {data.serviceDuration
              ? ` for a ${formatDuration(data.serviceDuration)} appointment`
              : ""}
            .
          </p>

          {availableCount === 0 && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-warning"
            >
              Every time on this day is already taken. Please try another date.
            </p>
          )}

          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {slots.map((slot) => (
              <li key={slot.start}>
                <SlotButton
                  slot={slot}
                  // A previously-chosen slot that has since been taken must not
                  // still read as "selected".
                  selected={selected?.start === slot.start && slot.available}
                  onSelect={() => choose(slot)}
                />
              </li>
            ))}
          </ul>

          <p className="text-xs text-slate-500">
            Crossed-out times are already booked or fall in a break. Times that
            are not listed at all cannot fit
            {data.serviceDuration
              ? ` a ${formatDuration(data.serviceDuration)} appointment`
              : " this appointment"}{" "}
            before closing.
          </p>
        </div>
      )}
    </StepShell>
  );
}
