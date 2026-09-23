import type {
  DateString,
  MinutesSinceMidnight,
  TimeString,
} from "@/lib/booking/types";

/**
 * Conversions between the two time representations the API uses:
 * "HH:MM" strings (availability slots, appointment-create payload) and minutes
 * since midnight (persisted appointments, opening hours).
 */

/** 570 -> "09:30" */
export function minutesToTimeString(
  minutes: MinutesSinceMidnight,
): TimeString {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** "09:30" -> 570. Returns NaN for malformed input. */
export function timeStringToMinutes(time: TimeString): MinutesSinceMidnight {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 570 -> "9:30 AM". Accepts minutes or an "HH:MM" string. */
export function formatTime12h(value: MinutesSinceMidnight | TimeString): string {
  const minutes =
    typeof value === "number" ? value : timeStringToMinutes(value);
  if (!Number.isFinite(minutes)) return "--:--";

  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = Math.round(minutes) % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, "0")} ${period}`;
}

/**
 * Format a Date as "YYYY-MM-DD" in LOCAL time.
 *
 * Deliberately not `toISOString()`, which converts to UTC and can shift the
 * date by a day for users west of Greenwich — a real booking bug.
 */
export function toDateString(date: Date): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse "YYYY-MM-DD" into a local-midnight Date.
 *
 * Also tolerates a full ISO datetime ("2026-09-22T00:00:00.000Z"), because the
 * API serialises date columns that way (`Appointment.appointmentDate`,
 * `BarberDayOff.date`) despite typing them as `DateString`. The prefix is
 * sliced rather than handed to `new Date(value)`: parsing the UTC form and then
 * reading local getters shifts the day back for anyone west of Greenwich.
 */
export function fromDateString(value: DateString): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Today at local midnight. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** A new Date `days` after `date` (local time, DST-safe). */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** True when both dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** e.g. "Tue, 17 Sep 2026" */
export function formatDateLong(value: DateString | Date): string {
  const date = typeof value === "string" ? fromDateString(value) : value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "45 min" / "1 h" / "1 h 30 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Weekday labels indexed to the API's `OpeningHour.weekday` (0 = Sunday). */
export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
