import "server-only";

// Server-side availability engine.
//
// Direct port of `backend/lib/availability.js` — behaviour-for-behaviour, with
// TypeScript types added where they help and deliberately loose where being
// precise would have meant changing the logic.
//
// The whole point of this module is that slot generation is NEVER trusted from
// the frontend: the same functions that answer `GET /api/availability` are the
// ones that re-validate a `POST /api/appointments` body.
//
// Times are minutes-since-midnight integers (0..1439) everywhere internally,
// and `date` is always a plain `"YYYY-MM-DD"` calendar string - never a moment
// in a timezone. Only the outermost serializer turns minutes into "HH:MM".

import { Prisma } from "@prisma/client";

import prisma from "./prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * `weekday` is carried on the real Prisma rows and on the test fixtures but is
 * never read here — the caller has already selected the right weekday's row.
 * It is declared optional so both shapes type-check without a cast.
 */
export interface OpeningHourLike {
  weekday?: number;
  isOpen?: boolean;
  openTime: number;
  closeTime: number;
}

export interface WorkingHourLike {
  weekday?: number;
  isWorking?: boolean;
  startTime: number;
  endTime: number;
}

export interface IntervalLike {
  weekday?: number;
  startTime: number;
  endTime: number;
  status?: string | null;
}

export interface DayOffLike {
  date?: Date | string;
}

export interface SlotInt {
  start: number;
  end: number;
  available: boolean;
}

export interface SlotWire {
  start: string;
  end: string;
  available: boolean;
}

// ---------------------------------------------------------------------------
// Pure time helpers
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 600 -> "10:00" */
/**
 * "Now" on the salon's wall clock, as a Date whose LOCAL getters
 * (getFullYear/getHours/...) read that wall-clock time - the convention the
 * rest of this engine (and its tests) already uses.
 *
 * The server's own clock is not the salon's: on a UTC host (Vercel) using
 * `new Date()` directly made "today" roll over at the wrong hour and let the
 * same-day cutoff sit hours behind the slot grid, offering times already past.
 * Salons have no timezone column yet, so one zone is applied platform-wide
 * (`SALON_TIMEZONE`, default Asia/Kolkata to match the INR/+91 catalogue).
 */
export function salonNow(timeZone = process.env.SALON_TIMEZONE || "Asia/Kolkata", at = new Date()): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(at)
      .map((p) => [p.type, Number(p.value)]),
  );
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "10:00" (or 600) -> 600. Returns null when unparseable / out of range. */
export function hhmmToMinutes(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 && value < 1440 ? value : null;
  }
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function isValidDateString(date: unknown): boolean {
  if (typeof date !== "string" || !DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

/**
 * A `"YYYY-MM-DD"` string as a UTC-midnight Date. This is what goes into a
 * Postgres `date` column via Prisma, and what `getUTCDay()` is read off of, so
 * the weekday can never drift with the server's local timezone.
 */
export function parseDateOnly(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** 0 = Sunday .. 6 = Saturday, computed from the calendar string only. */
export function weekdayOf(date: string): number {
  return parseDateOnly(date).getUTCDay();
}

/** A Date -> the salon's local calendar day as "YYYY-MM-DD". */
export function toDateString(dateLike: Date | string | number): string {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A Date (or Prisma `@db.Date` value) -> "YYYY-MM-DD" read in UTC. */
export function utcDateString(dateLike: Date | string | number): string {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Whole days between two calendar strings (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDateOnly(b).getTime() - parseDateOnly(a).getTime()) / 86400000);
}

/**
 * Strict interval overlap. Touching intervals do NOT overlap: an appointment
 * ending exactly at 11:00 leaves an 11:00 slot bookable.
 */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// ---------------------------------------------------------------------------
// Pure slot computation
// ---------------------------------------------------------------------------

/**
 * Intersect the salon's opening hours with the barber's working hours.
 * Returns null when the barber cannot work that day at all.
 */
export function getEffectiveWindow({
  openingHour,
  workingHour,
}: {
  openingHour?: OpeningHourLike | null;
  workingHour?: WorkingHourLike | null;
}): { start: number; end: number } | null {
  if (!openingHour || openingHour.isOpen === false) return null;
  if (!workingHour || workingHour.isWorking === false) return null;

  const start = Math.max(openingHour.openTime, workingHour.startTime);
  const end = Math.min(openingHour.closeTime, workingHour.endTime);
  if (start >= end) return null;
  return { start, end };
}

/**
 * Candidate starts on the salon's slot grid, keeping only those where the FULL
 * service duration still fits before `end`. A 45-minute service simply has no
 * 19:30 candidate when closing is 20:00 - the slot is absent, not `available:false`.
 */
export function generateCandidateSlots({
  window,
  durationMinutes,
  slotIntervalMinutes,
}: {
  window?: { start: number; end: number } | null;
  durationMinutes?: number | null;
  slotIntervalMinutes?: number;
}): SlotInt[] {
  const slots: SlotInt[] = [];
  if (!window || !durationMinutes || durationMinutes <= 0) return slots;
  const step = slotIntervalMinutes && slotIntervalMinutes > 0 ? slotIntervalMinutes : 15;
  for (let t = window.start; t + durationMinutes <= window.end; t += step) {
    slots.push({ start: t, end: t + durationMinutes, available: true });
  }
  return slots;
}

/**
 * Flip `available` to false for candidates that collide with a break, an
 * existing appointment, or the minimum-advance-booking cutoff.
 */
export function markUnavailable(
  candidates: SlotInt[],
  {
    breaks = [],
    existingAppointments = [],
    cutoffMinutes = null,
  }: {
    breaks?: IntervalLike[];
    existingAppointments?: IntervalLike[];
    cutoffMinutes?: number | null;
  },
): SlotInt[] {
  return candidates.map((slot) => {
    let available = slot.available !== false;

    if (available && cutoffMinutes !== null && slot.start < cutoffMinutes) {
      available = false;
    }
    if (available) {
      for (const b of breaks) {
        if (overlaps(b.startTime, b.endTime, slot.start, slot.end)) {
          available = false;
          break;
        }
      }
    }
    if (available) {
      for (const appt of existingAppointments) {
        if (overlaps(appt.startTime, appt.endTime, slot.start, slot.end)) {
          available = false;
          break;
        }
      }
    }
    return { start: slot.start, end: slot.end, available };
  });
}

/**
 * The core pure function - everything it needs is passed in as plain objects,
 * so it is unit-testable with zero database access.
 */
export function computeSlotsForBarber({
  openingHour,
  workingHour,
  breaks = [],
  existingAppointments = [],
  service,
  slotIntervalMinutes = 15,
  minimumAdvanceBookingMinutes = 0,
  date,
  now = salonNow(),
  isDayOff = false,
  daysOff = null,
}: {
  openingHour?: OpeningHourLike | null;
  workingHour?: WorkingHourLike | null;
  breaks?: IntervalLike[];
  existingAppointments?: IntervalLike[];
  /** Only `durationMinutes` is read. */
  service?: { durationMinutes: number } | null;
  slotIntervalMinutes?: number;
  minimumAdvanceBookingMinutes?: number;
  date: string;
  now?: Date;
  isDayOff?: boolean;
  daysOff?: DayOffLike[] | null;
}): SlotInt[] {
  // Salon closed that weekday beats any barber schedule.
  if (!openingHour || openingHour.isOpen === false) return [];

  const offToday =
    isDayOff ||
    (Array.isArray(daysOff) &&
      daysOff.some((d) =>
        utcDateString(
          (d as DayOffLike).date !== undefined
            ? ((d as DayOffLike).date as Date | string)
            : (d as unknown as Date | string),
        ) === date,
      ));
  if (offToday) return [];

  const window = getEffectiveWindow({ openingHour, workingHour });
  if (!window) return [];

  const candidates = generateCandidateSlots({
    window,
    durationMinutes: service && service.durationMinutes,
    slotIntervalMinutes,
  });
  if (candidates.length === 0) return [];

  // The minimum-advance cutoff only applies to "today" on the salon's clock.
  let cutoffMinutes: number | null = null;
  if (toDateString(now) === date) {
    cutoffMinutes = now.getHours() * 60 + now.getMinutes() + (minimumAdvanceBookingMinutes || 0);
  }

  const active = existingAppointments.filter(
    (a) => !a.status || (a.status !== "CANCELLED" && a.status !== "NO_SHOW"),
  );

  return markUnavailable(candidates, { breaks, existingAppointments: active, cutoffMinutes });
}

/**
 * Union per-barber slot lists by start time: a start is available when at
 * least one barber is free for it.
 */
export function unionSlots(perBarberSlots: SlotInt[][]): SlotInt[] {
  const byStart = new Map<number, SlotInt>();
  for (const slots of perBarberSlots) {
    for (const slot of slots) {
      const existing = byStart.get(slot.start);
      if (!existing) {
        byStart.set(slot.start, { start: slot.start, end: slot.end, available: slot.available });
      } else if (slot.available) {
        existing.available = true;
      }
    }
  }
  return [...byStart.values()].sort((a, b) => a.start - b.start);
}

/** Minute ints -> the public "HH:MM" wire shape. */
export function serializeSlots(slots: SlotInt[]): SlotWire[] {
  return slots.map((s) => ({
    start: minutesToHHMM(s.start),
    end: minutesToHHMM(s.end),
    available: s.available,
  }));
}

// ---------------------------------------------------------------------------
// Booking-window validation
// ---------------------------------------------------------------------------

/**
 * Rejects malformed dates, past dates, and dates beyond the salon's
 * maximumAdvanceBookingDays. Returns `{ ok, message }` - it is the
 * route handler's job to turn `ok:false` into an HTTP 400.
 */
export function validateBookingDate({
  date,
  salonSettings,
  now = salonNow(),
}: {
  date: string;
  salonSettings?: { maximumAdvanceBookingDays?: number } | null;
  now?: Date;
}): { ok: boolean; message?: string } {
  if (!isValidDateString(date)) {
    return { ok: false, message: "Invalid date. Expected format YYYY-MM-DD." };
  }
  const today = toDateString(now);
  const delta = daysBetween(today, date);
  if (delta < 0) {
    return { ok: false, message: "Cannot book a date in the past." };
  }
  const maxDays = (salonSettings && salonSettings.maximumAdvanceBookingDays) || 30;
  if (delta > maxDays) {
    return { ok: false, message: `Bookings are only open up to ${maxDays} days in advance.` };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Prisma-backed loading + public entry points
// ---------------------------------------------------------------------------

export class AvailabilityError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AvailabilityError";
    this.status = status;
    // Keeps `instanceof` working across the transpiled class hierarchy.
    Object.setPrototypeOf(this, AvailabilityError.prototype);
  }
}

/** De-duplicated, order-preserving list of non-empty ids. */
export function uniqueIds(ids: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && id && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * `?serviceIds=a,b` (multi-service) or the legacy `?serviceId=a` (older app
 * builds). Empty when neither is present.
 */
export function serviceIdsFromQuery(searchParams: URLSearchParams): string[] {
  const list = searchParams.get("serviceIds");
  if (list) return uniqueIds(list.split(",").map((s) => s.trim())).slice(0, MAX_SERVICES_PER_BOOKING);
  const single = searchParams.get("serviceId");
  return single ? [single] : [];
}

/** Upper bound on services in one booking (keeps a single slot sane). */
export const MAX_SERVICES_PER_BOOKING = 10;

/** The salon's services for `ids`, in the order given. Any missing id is a 404. */
export async function loadServices(salonId: string, ids: string[], activeOnly: boolean) {
  const rows = await prisma.service.findMany({
    where: { id: { in: ids }, salonId, ...(activeOnly ? { isActive: true } : {}) },
  });
  const ordered = ids.map((id) => rows.find((r) => r.id === id));
  if (ordered.some((r) => !r)) throw new AvailabilityError("Service not found.", 404);
  return ordered as typeof rows;
}

/**
 * Several services done back-to-back, seen as one: the first service's id and
 * the summed duration and price. Every caller that only needs "how long / how
 * much" keeps working unchanged.
 */
export function bundleServices<
  T extends { id: string; name: string; durationMinutes: number; price: Prisma.Decimal },
>(services: T[]) {
  const [first] = services;
  return {
    ...first,
    name: services.map((s) => s.name).join(" + "),
    durationMinutes: services.reduce((sum, s) => sum + s.durationMinutes, 0),
    price: services.reduce((sum, s) => sum.add(s.price), new Prisma.Decimal(0)),
  };
}

/**
 * Loads everything the pure functions need for a date + service + barber(s).
 * `excludeAppointmentId` lets a reschedule ignore the row being moved.
 */
export async function loadContext({
  salonId,
  serviceIds,
  barberId = "any",
  date,
  excludeAppointmentId = null,
  bookableOnly = false,
  onlineBooking = false,
}: {
  salonId: string;
  /** One or more services, performed back-to-back by ONE barber, in this order. */
  serviceIds: string[];
  barberId?: string;
  date: string;
  excludeAppointmentId?: string | null;
  /**
   * Public customer booking: only ACTIVE services and ACTIVE barbers who
   * actually perform the service may be booked. Staff flows (reschedule) leave
   * this off so an existing appointment can still be moved.
   */
  bookableOnly?: boolean;
  /**
   * A NEW customer booking: only workers with online pre-booking switched on.
   * (A customer moving an existing booking does not need it.)
   */
  onlineBooking?: boolean;
}) {
  const weekday = weekdayOf(date);
  const dayDate = parseDateOnly(date);

  const ids = uniqueIds(serviceIds);
  if (ids.length === 0) throw new AvailabilityError("At least one service is required.", 400);

  const [salonSettings, openingHour, services] = await Promise.all([
    prisma.salonSettings.findUnique({ where: { salonId } }),
    prisma.salonOpeningHour.findUnique({ where: { salonId_weekday: { salonId, weekday } } }),
    loadServices(salonId, ids, bookableOnly),
  ]);

  if (!salonSettings) throw new AvailabilityError("Salon settings have not been configured.", 500);
  const service = bundleServices(services);

  // The one barber must perform EVERY chosen service.
  const offersAll = { AND: ids.map((id) => ({ services: { some: { id } } })) };
  const online = onlineBooking ? { onlineBookingEnabled: true } : {};
  const wantsAny = !barberId || barberId === "any";
  const barbers = wantsAny
    ? await prisma.barber.findMany({
        where: { salonId, isActive: true, ...offersAll, ...online },
        orderBy: { id: "asc" },
      })
    : await prisma.barber.findMany({
        where: {
          id: barberId,
          salonId,
          ...(bookableOnly ? { isActive: true, ...offersAll } : {}),
          ...online,
        },
        orderBy: { id: "asc" },
      });

  if (!wantsAny && barbers.length === 0) {
    throw new AvailabilityError(
      bookableOnly ? "That barber isn't available for this service." : "Barber not found.",
      404,
    );
  }

  const barberIds = barbers.map((b) => b.id);
  const [workingHours, breaks, daysOff, appointments] = await Promise.all([
    barberIds.length
      ? prisma.barberWorkingHour.findMany({ where: { barberId: { in: barberIds }, weekday } })
      : [],
    barberIds.length
      ? prisma.barberBreak.findMany({ where: { barberId: { in: barberIds }, weekday } })
      : [],
    barberIds.length
      ? prisma.barberDayOff.findMany({ where: { barberId: { in: barberIds }, date: dayDate } })
      : [],
    barberIds.length
      ? prisma.appointment.findMany({
          where: {
            salonId,
            barberId: { in: barberIds },
            appointmentDate: dayDate,
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            // Quick sales are records, not calendar bookings.
            blocksCalendar: true,
            ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
          },
        })
      : [],
  ]);

  const byBarber = barbers.map((barber) => ({
    barber,
    workingHour: workingHours.find((w) => w.barberId === barber.id) || null,
    breaks: breaks.filter((b) => b.barberId === barber.id),
    isDayOff: daysOff.some((d) => d.barberId === barber.id),
    existingAppointments: appointments.filter((a) => a.barberId === barber.id),
  }));

  return { salonSettings, openingHour, service, services, wantsAny, barbers: byBarber };
}

/**
 * Availability including the per-barber breakdown. Internal - the booking path
 * needs to know WHICH barber an "any" slot resolves to.
 */
export async function computeAvailabilityDetailed({
  salonId,
  serviceIds,
  barberId = "any",
  date,
  now = salonNow(),
  excludeAppointmentId = null,
  bookableOnly = false,
  onlineBooking = false,
}: {
  salonId: string;
  serviceIds: string[];
  barberId?: string;
  date: string;
  now?: Date;
  excludeAppointmentId?: string | null;
  bookableOnly?: boolean;
  /** New customer booking: only workers open for online pre-booking. */
  onlineBooking?: boolean;
}) {
  const ctx = await loadContext({ salonId, serviceIds, barberId, date, excludeAppointmentId, bookableOnly, onlineBooking });
  const { salonSettings, openingHour, service } = ctx;

  const check = validateBookingDate({ date, salonSettings, now });
  if (!check.ok) throw new AvailabilityError(check.message as string, 400);

  const perBarber = ctx.barbers.map((entry) => ({
    barberId: entry.barber.id,
    barberName: entry.barber.name,
    slots: computeSlotsForBarber({
      openingHour,
      workingHour: entry.workingHour,
      breaks: entry.breaks,
      existingAppointments: entry.existingAppointments,
      service,
      slotIntervalMinutes: salonSettings.slotIntervalMinutes,
      minimumAdvanceBookingMinutes: salonSettings.minimumAdvanceBookingMinutes,
      date,
      now,
      isDayOff: entry.isDayOff,
    }),
  }));

  const merged = unionSlots(perBarber.map((p) => p.slots));

  return {
    date,
    barberId: ctx.wantsAny ? "any" : barberId,
    serviceDuration: service.durationMinutes,
    slots: serializeSlots(merged),
    // internal-only extras, stripped by computeAvailability()
    _perBarber: perBarber,
    _service: service,
    _services: ctx.services,
    _salonSettings: salonSettings,
  };
}

/** Public-facing availability payload. */
export async function computeAvailability(opts: {
  onlineBooking?: boolean;
  salonId: string;
  serviceIds: string[];
  barberId?: string;
  date: string;
  now?: Date;
  excludeAppointmentId?: string | null;
  bookableOnly?: boolean;
}) {
  const detailed = await computeAvailabilityDetailed(opts);
  return {
    date: detailed.date,
    barberId: detailed.barberId,
    serviceDuration: detailed.serviceDuration,
    slots: detailed.slots,
  };
}

export type ResolveBookingResult =
  | {
      ok: true;
      barberId: string;
      /** The bundle: totals over all services, `id` of the first. */
      service: Awaited<ReturnType<typeof loadContext>>["service"];
      services: Awaited<ReturnType<typeof loadContext>>["services"];
      salonSettings: Awaited<ReturnType<typeof loadContext>>["salonSettings"];
      startTime: number;
      endTime: number;
    }
  | { ok: false; status: number; message: string };

/**
 * Re-validates a requested booking entirely server-side.
 *
 * Returns `{ ok:true, barberId, service, startTime, endTime }` where `barberId`
 * is the concrete resolved barber (never "any"), or `{ ok:false, status, message }`.
 *
 * - an off-grid `startTime` is rejected (a tampered request that never came
 *   from our own slot list),
 * - "any" resolves to the first qualified+free barber in stable `id asc` order,
 * - a taken slot yields the exact spec'd "This slot is no longer available."
 */
export async function resolveBooking({
  salonId,
  serviceIds,
  barberId = "any",
  date,
  startTime,
  now = salonNow(),
  excludeAppointmentId = null,
  bookableOnly = false,
  onlineBooking = false,
}: {
  salonId: string;
  serviceIds: string[];
  barberId?: string;
  date: string;
  startTime: unknown;
  now?: Date;
  excludeAppointmentId?: string | null;
  bookableOnly?: boolean;
  onlineBooking?: boolean;
}): Promise<ResolveBookingResult> {
  const requestedStart = hhmmToMinutes(startTime);
  if (requestedStart === null) {
    return { ok: false, status: 400, message: "Invalid startTime. Expected format HH:MM." };
  }

  let detailed: Awaited<ReturnType<typeof computeAvailabilityDetailed>>;
  try {
    detailed = await computeAvailabilityDetailed({
      salonId,
      serviceIds,
      barberId,
      date,
      now,
      excludeAppointmentId,
      bookableOnly,
      onlineBooking,
    });
  } catch (err) {
    if (err instanceof AvailabilityError) {
      return { ok: false, status: err.status, message: err.message };
    }
    throw err;
  }

  const service = detailed._service;
  const candidates = detailed._perBarber
    .map((p) => ({ barberId: p.barberId, slot: p.slots.find((s) => s.start === requestedStart) }))
    .filter((c) => c.slot);

  // Not on the grid for ANY candidate barber -> tampered / stale request.
  if (candidates.length === 0) {
    return { ok: false, status: 400, message: "The requested time is not a valid booking slot." };
  }

  const free = candidates.find((c) => c.slot!.available);
  if (!free) {
    return { ok: false, status: 409, message: "This slot is no longer available." };
  }

  return {
    ok: true,
    barberId: free.barberId,
    service,
    services: detailed._services,
    salonSettings: detailed._salonSettings,
    startTime: requestedStart,
    endTime: requestedStart + service.durationMinutes,
  };
}

/** Thin alias kept for readability at the call site. */
export async function resolveAnyBarber({
  salonId,
  serviceIds,
  date,
  startTime,
  now = salonNow(),
}: {
  salonId: string;
  serviceIds: string[];
  date: string;
  startTime: unknown;
  now?: Date;
}): Promise<string | null> {
  const result = await resolveBooking({ salonId, serviceIds, barberId: "any", date, startTime, now });
  return result.ok ? result.barberId : null;
}
