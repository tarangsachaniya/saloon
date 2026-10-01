/**
 * What a customer may do with one of their own appointments. Pure (no DB), so
 * the same rules drive the list flags shown in the UI AND the checks the
 * cancel/reschedule routes enforce - they cannot drift apart.
 *
 * All times are the salon's wall clock: `now` is `salonNow()` and the
 * appointment start is built from its stored date + minutes the same way.
 */

export const LIVE_STATUSES = ["PENDING", "CONFIRMED"] as const;
export type Bucket = "upcoming" | "past" | "cancelled";

interface Timed {
  appointmentDate: Date;
  startTime: number;
  endTime: number;
  status: string;
}

/** Local-getter Date for the appointment's start (date is stored as UTC midnight). */
export function wallClock(date: Date, minutes: number): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, minutes);
}

export function bucketOf(a: Timed, now: Date): Bucket {
  if (a.status === "CANCELLED") return "cancelled";
  if (a.status === "COMPLETED" || a.status === "NO_SHOW") return "past";
  return wallClock(a.appointmentDate, a.endTime) > now ? "upcoming" : "past";
}

export interface Decision {
  allowed: boolean;
  /** Customer-facing explanation when not allowed. */
  reason?: string;
}

const isLive = (status: string) => (LIVE_STATUSES as readonly string[]).includes(status);

/**
 * Cancel and reschedule share one rule set: the appointment must still be
 * live and in the future, and must start at least `cancellationWindowMinutes`
 * from now.
 */
export function changeDecision(
  a: Timed,
  now: Date,
  cancellationWindowMinutes: number,
  verb: "cancel" | "reschedule",
): Decision {
  if (a.status === "CANCELLED") return { allowed: false, reason: "This appointment was already cancelled." };
  if (!isLive(a.status)) return { allowed: false, reason: `This appointment can no longer be ${verb === "cancel" ? "cancelled" : "rescheduled"}.` };

  const start = wallClock(a.appointmentDate, a.startTime);
  if (start <= now) return { allowed: false, reason: "This appointment has already started or passed." };

  const minutesLeft = (start.getTime() - now.getTime()) / 60000;
  if (minutesLeft < cancellationWindowMinutes) {
    const h = cancellationWindowMinutes / 60;
    const label = cancellationWindowMinutes % 60 === 0 && h >= 1 ? `${h} hour${h === 1 ? "" : "s"}` : `${cancellationWindowMinutes} minutes`;
    return {
      allowed: false,
      reason: `Changes are closed within ${label} of the appointment. Please contact the salon.`,
    };
  }
  return { allowed: true };
}
