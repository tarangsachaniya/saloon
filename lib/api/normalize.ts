import type { Appointment, Barber, DateString, Service } from "@/lib/booking/types";

/**
 * Response normalisers that make the declared types in `lib/booking/types.ts`
 * actually true at runtime.
 *
 * WHY THIS EXISTS (found while building M5 against the live backend):
 *
 *  1. Prisma serialises a `Decimal` column to JSON as a STRING. `GET /api/services`
 *     really returns `"price": "300"`, and so does the `price` on a created
 *     `Appointment` — even though `types.ts` declares `price: number`. Anything
 *     doing arithmetic on it (`a.price + b.price`, `price.toFixed(2)`) would
 *     silently concatenate or throw at runtime while type-checking cleanly.
 *
 *  2. Prisma serialises a `Date`/`@db.Date` column as a full ISO datetime.
 *     `Appointment.appointmentDate` really comes back as
 *     `"2026-09-22T00:00:00.000Z"`, not the `"YYYY-MM-DD"` the type promises.
 *     Feeding that to `fromDateString`/`formatDateLong` produced "Invalid Date".
 *
 * Normalising at the API boundary (rather than defensively at every call site)
 * keeps the domain types honest for every consumer, M6's admin views included.
 *
 * M6 EXTENSION: the same two quirks appear on two shapes M5 never read, so
 * `normalizeBarber` was added and wired into `lib/api/barbers.ts`:
 *   - `Barber.daysOff[].date` is a full ISO datetime (`"2026-09-21T00:00:00.000Z"`),
 *     which the barber schedule editor has to round-trip as a calendar date.
 *   - `Barber.services[].price` on the DETAIL response is the same Decimal
 *     string (`"300"`) as `Service.price`.
 */

/** Coerce an API number-or-numeric-string to a real number. NaN when unusable. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
}

/**
 * Reduce an ISO datetime to its calendar-date prefix.
 *
 * Deliberately a string slice, NOT `new Date(value)` + local getters: the API
 * sends midnight UTC, so re-reading it in any timezone behind Greenwich would
 * shift the appointment back a day — the exact bug `toDateString` exists to
 * avoid elsewhere.
 */
export function toDateOnly(value: string): DateString {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : value;
}

/** Make `Service.price` a number. */
export function normalizeService(service: Service): Service {
  return { ...service, price: toNumber(service.price) };
}

/** Make `Appointment.price` a number and `appointmentDate` a "YYYY-MM-DD". */
export function normalizeAppointment(appointment: Appointment): Appointment {
  const normalized: Appointment = {
    ...appointment,
    appointmentDate: toDateOnly(appointment.appointmentDate),
    price: toNumber(appointment.price),
    amountCharged:
      appointment.amountCharged === null || appointment.amountCharged === undefined
        ? appointment.amountCharged
        : toNumber(appointment.amountCharged),
  };
  if (appointment.services) {
    normalized.services = appointment.services.map((item) => ({ ...item, price: toNumber(item.price) }));
  }
  if (appointment.service) {
    normalized.service = normalizeService(appointment.service);
  }
  return normalized;
}

/**
 * Make `Barber.daysOff[].date` a "YYYY-MM-DD" and `Barber.services[].price` a
 * number (both only present on the detail response).
 *
 * The day-off date is sliced, never re-parsed, for the same timezone reason as
 * `toDateOnly` — the API sends midnight UTC, and `new Date(...)` + local getters
 * would move a day off backwards for anyone west of Greenwich, silently taking
 * the wrong day out of the barber's calendar.
 */
export function normalizeBarber(barber: Barber): Barber {
  const normalized: Barber = { ...barber };
  if (barber.services) {
    normalized.services = barber.services.map((service) =>
      service.price === undefined
        ? service
        : { ...service, price: toNumber(service.price) },
    );
  }
  if (barber.daysOff) {
    normalized.daysOff = barber.daysOff.map((dayOff) => ({
      ...dayOff,
      date: toDateOnly(dayOff.date),
    }));
  }
  return normalized;
}
