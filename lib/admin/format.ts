import type { DateString } from "@/lib/booking/types";
import { fromDateString, WEEKDAY_LABELS } from "@/lib/utils/time";

/**
 * Deterministic date formatting for the admin screens.
 *
 * WHY NOT `formatDateLong` FROM `lib/utils/time.ts`: that one calls
 * `toLocaleDateString(undefined, …)`, which resolves to whatever locale and ICU
 * data the RUNTIME happens to have. Node and Chromium ship different ICU
 * versions, so the same timestamp prerenders as "Fri, 18 Sept 2026" on the
 * server and hydrates as "Fri, 18 Sept, 2026" in the browser — a real hydration
 * mismatch, observed in a headless browser on a hard load of `/dashboard` and
 * `/dashboard/appointments`, where the date sits in the page header and is
 * therefore rendered during SSR rather than after a client-side fetch.
 *
 * `formatDateLong` stays exactly as it is: on the customer-facing booking flow,
 * honouring the visitor's own locale is the correct behaviour, and every date
 * there renders after a client-side load where the mismatch cannot arise.
 * The back office is a single salon's internal tool, so a fixed, unambiguous
 * format is no loss — and it is the same string in both runtimes by
 * construction, because no `Intl` lookup is involved.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** e.g. "Fri, 18 Sep 2026". Accepts "YYYY-MM-DD", an ISO datetime, or a Date. */
export function formatAdminDate(value: DateString | Date): string {
  const date = typeof value === "string" ? fromDateString(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const weekday = WEEKDAY_LABELS[date.getDay()].slice(0, 3);
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  return `${weekday}, ${day} ${month} ${date.getFullYear()}`;
}
