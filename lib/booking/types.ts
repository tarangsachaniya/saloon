/**
 * Shared API types for the single-salon booking system.
 *
 * These mirror the backend contract exactly (camelCase throughout). Treat this
 * file as the single source of truth for response shapes — `lib/api/*` and every
 * page/component should import from here rather than redeclaring shapes inline.
 *
 * Time representation is deliberately inconsistent in the API and that is
 * reproduced faithfully here:
 *   - Availability slots use "HH:MM" strings.
 *   - `POST /api/appointments` accepts `startTime` as an "HH:MM" string.
 *   - A persisted `Appointment` returns `startTime`/`endTime` as NUMBERS
 *     (minutes since midnight), as do `OpeningHour.openTime`/`closeTime`.
 * Use the helpers in `lib/utils/time.ts` to convert between the two.
 */

/** "YYYY-MM-DD" */
export type DateString = string;

/** "HH:MM" in 24-hour form, e.g. "09:30". */
export type TimeString = string;

/** Minutes elapsed since midnight, e.g. 570 === "09:30". */
export type MinutesSinceMidnight = number;

/** Sentinel accepted by the API wherever a concrete barber id is optional. */
export const ANY_BARBER = "any" as const;
export type AnyBarber = typeof ANY_BARBER;

/** A barber id, or the "any barber" sentinel. */
export type BarberSelection = string | AnyBarber;

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

/** `GET /api/services` */
export interface Service {
  id: string;
  name: string;
  description: string | null;
  /**
   * NOTE: on the wire this is a STRING ("300") — Prisma serialises `Decimal`
   * that way. `lib/api/normalize.ts` coerces it to a real number at the API
   * boundary, which is what makes this declaration true for callers.
   */
  price: number;
  durationMinutes: number;
  category: string | null;
  isActive: boolean;
}

/** A working-hours/break/day-off row as persisted (has an `id`, unlike the *Input variants below). */
export interface BarberWorkingHour {
  id: string;
  weekday: number;
  isWorking: boolean;
  startTime: number;
  endTime: number;
}
export interface BarberBreak {
  id: string;
  weekday: number;
  startTime: number;
  endTime: number;
  label: string | null;
}
export interface BarberDayOff {
  id: string;
  /**
   * "YYYY-MM-DD".
   * NOTE: like `Appointment.appointmentDate`, the wire form is a full ISO
   * datetime. As of M6 `normalizeBarber` (wired into every `lib/api/barbers.ts`
   * reader and writer) slices it back to a calendar date, so this declaration
   * is true for callers.
   */
  date: DateString;
  reason: string | null;
}

/**
 * `GET /api/barbers?serviceId=` (list) / `GET /api/barbers/:id` (detail).
 * The list response's `services` is just `{id, name}`; the detail response
 * (and `getAdminBarbers`/`getBarber`) includes the richer shape plus the full
 * weekly schedule — all optional here since not every response includes them.
 */
export interface Barber {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  bio: string | null;
  specializations: string[];
  isActive: boolean;
  /** Owner dashboard only (never sent to staff or the public site). Decimal string on the wire. */
  commissionPercentage?: number | string;
  services?: Array<
    Pick<Service, "id" | "name"> & Partial<Pick<Service, "durationMinutes" | "price" | "isActive">>
  >;
  workingHours?: BarberWorkingHour[];
  breaks?: BarberBreak[];
  daysOff?: BarberDayOff[];
}

/* -------------------------------------------------------------------------- */
/* Availability                                                                */
/* -------------------------------------------------------------------------- */

/** One candidate booking window returned by the availability endpoint. */
export interface Slot {
  /** "HH:MM" */
  start: TimeString;
  /** "HH:MM" */
  end: TimeString;
  available: boolean;
}

/** `GET /api/availability?serviceId=&barberId=&date=` */
export interface AvailabilityResponse {
  /** "YYYY-MM-DD" */
  date: DateString;
  /** Echoes the requested barber, so may be the literal "any". */
  barberId: BarberSelection;
  /** Duration in minutes of the service the slots were computed for. */
  serviceDuration: number;
  slots: Slot[];
}

export interface AvailabilityQuery {
  serviceId: string;
  barberId: BarberSelection;
  /** "YYYY-MM-DD" */
  date: DateString;
}

/* -------------------------------------------------------------------------- */
/* Appointments                                                                */
/* -------------------------------------------------------------------------- */

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

/** Every status value, in natural lifecycle order. Handy for admin filters. */
export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  serviceId: string;
  /**
   * "YYYY-MM-DD".
   * NOTE: on the wire this is a full ISO datetime ("2026-09-22T00:00:00.000Z");
   * `lib/api/normalize.ts` slices it back to a calendar date at the API
   * boundary (a slice, not a re-parse, so the day cannot shift by timezone).
   */
  appointmentDate: DateString;
  /** Minutes since midnight. */
  startTime: MinutesSinceMidnight;
  /** Minutes since midnight. */
  endTime: MinutesSinceMidnight;
  durationMinutes: number;
  /** Also a string on the wire — normalised to a number. See `Service.price`. */
  price: number;
  status: AppointmentStatus;
  notes: string | null;
  /**
   * The backend always includes these three relations (booking creation and
   * every admin appointment endpoint) — optional here only because a caller
   * could in principle construct a bare `Appointment` without them.
   */
  client?: Client;
  barber?: Barber;
  service?: Service;
}

/** Request body for `POST /api/appointments`. */
export interface CreateAppointmentPayload {
  serviceId: string;
  /** A barber id, or "any" to let the backend allocate one. */
  barberId: BarberSelection;
  /** "YYYY-MM-DD" */
  date: DateString;
  /** "HH:MM" — note: a string here, even though `Appointment` returns a number. */
  startTime: TimeString;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  /** Data-processing consent. Mandatory: the API rejects a booking without it. */
  consent: true;
  /** Separate, optional marketing opt-in. */
  marketingOptIn?: boolean;
}

/**
 * `POST /api/appointments` result.
 *
 * The failure `message` is opaque — render it as-is, never branch on its text.
 * (e.g. "This slot is no longer available." on a double-booking race.)
 */
export type CreateAppointmentResult =
  | { success: true; appointment: Appointment }
  | { success: false; message: string; /** HTTP status of the rejection, when known. */ status?: number };

/**
 * Body for `PATCH /api/admin/appointments/:id`.
 * NOTE: the reschedule date field is named `date` here (matching the request
 * body the backend expects), NOT `appointmentDate` (which is only the
 * *response* field name on `Appointment`).
 */
export interface UpdateAppointmentPayload {
  status?: AppointmentStatus;
  notes?: string | null;
  barberId?: string;
  serviceId?: string;
  /** "YYYY-MM-DD" */
  date?: DateString;
  /** "HH:MM" */
  startTime?: TimeString;
}

/** Query filters for `GET /api/admin/appointments`. */
export interface AdminAppointmentQuery {
  /** "YYYY-MM-DD" — a single-day filter. Takes precedence over `from`/`to`. */
  date?: DateString;
  /**
   * "YYYY-MM-DD" — inclusive range start. Verified against
   * `appointmentController.listAppointments`, which reads `from`/`to` and is
   * only consulted when `date` is absent.
   */
  from?: DateString;
  /** "YYYY-MM-DD" — inclusive range end. See `from`. */
  to?: DateString;
  barberId?: string;
  status?: AppointmentStatus;
}

/* -------------------------------------------------------------------------- */
/* Clients                                                                     */
/* -------------------------------------------------------------------------- */

/** `GET /api/admin/clients` / `GET /api/admin/clients/:id`. */
export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes?: string | null;
  totalVisits: number;
  /** ISO datetime, or null if the client has never completed a visit. */
  lastVisit: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Present only on `GET /api/admin/clients/:id` (merged in by `getClient`). */
  appointments?: Appointment[];
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

/** One weekday's trading hours. */
export interface OpeningHour {
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  isOpen: boolean;
  /** Minutes since midnight. */
  openTime: MinutesSinceMidnight;
  /** Minutes since midnight. */
  closeTime: MinutesSinceMidnight;
}

/** `GET /api/settings` (and the body shape of `PATCH /api/admin/settings`). */
export interface SalonSettings {
  name: string;
  /**
   * NOTE (M6): these four are `String?` in `prisma/schema.prisma` and the live
   * `GET /api/settings` really does return `"logo": null`. They were declared
   * as plain `string` in the M4 scaffold, which type-checked cleanly while
   * being false at runtime — `settings.phone.replace(...)` or
   * `<img src={settings.logo}>` would have thrown on a salon that had not
   * filled them in. `app/page.tsx` already guarded them defensively; this makes
   * the declaration agree with both the database and that code.
   */
  logo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  /**
   * OpenStreetMap embed URL generated from the salon's latitude/longitude.
   * Stored in `Salon.mapUrl`. Null when the owner has not set coordinates yet.
   */
  mapUrl: string | null;
  /** Granularity of generated availability slots. */
  slotIntervalMinutes: number;
  /** How far ahead of "now" a booking must be made. */
  minimumAdvanceBookingMinutes: number;
  /** How far into the future the calendar may be opened. */
  maximumAdvanceBookingDays: number;
  /** Window before the appointment in which a customer may still cancel. */
  cancellationWindowMinutes: number;
  openingHours: OpeningHour[];
}

export type UpdateSalonSettingsPayload = Partial<SalonSettings>;

/* -------------------------------------------------------------------------- */
/* Auth (admin/staff only — customers never authenticate)                      */
/* -------------------------------------------------------------------------- */

export type UserRole = "SUPER_ADMIN" | "OWNER" | "STAFF" | "CUSTOMER";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  /** Null for SUPER_ADMIN. */
  salonId: string | null;
  salonSlug: string | null;
  salonName: string | null;
}

/** `POST /api/auth/login` success body. */
export interface LoginResponse {
  success: true;
  token: string;
  user: User;
}

/* -------------------------------------------------------------------------- */
/* Admin write payloads                                                        */
/* -------------------------------------------------------------------------- */

/** One weekday's schedule for a barber (`BarberWorkingHour`). */
export interface BarberWorkingHourInput {
  weekday: number;
  isWorking?: boolean;
  /** Minutes since midnight. */
  startTime: number;
  /** Minutes since midnight. */
  endTime: number;
}

/** A recurring weekly break, e.g. lunch (`BarberBreak`). */
export interface BarberBreakInput {
  weekday: number;
  startTime: number;
  endTime: number;
  label?: string | null;
}

/** A one-off day the barber is unavailable (`BarberDayOff`). */
export interface BarberDayOffInput {
  /** "YYYY-MM-DD" */
  date: DateString;
  reason?: string | null;
}

export interface CreateBarberPayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  photo?: string | null;
  bio?: string | null;
  specializations?: string[];
  isActive?: boolean;
  /** Service ids this barber is qualified to perform. */
  serviceIds?: string[];
  /**
   * Full weekly schedule. On update, sending this array REPLACES the barber's
   * entire working-hours set (same for `breaks` and `daysOff` below) — the
   * backend does a delete-then-recreate, not a per-row patch.
   */
  workingHours?: BarberWorkingHourInput[];
  breaks?: BarberBreakInput[];
  daysOff?: BarberDayOffInput[];
}
export type UpdateBarberPayload = Partial<CreateBarberPayload>;

export interface CreateServicePayload {
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category?: string | null;
  isActive?: boolean;
}
export type UpdateServicePayload = Partial<CreateServicePayload>;

/* -------------------------------------------------------------------------- */
/* Generic envelopes                                                           */
/* -------------------------------------------------------------------------- */

/** Shape the API uses for plain failures. */
export interface ApiFailure {
  success: false;
  message: string;
}
