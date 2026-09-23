import { del, get, patch, post } from "./client";
import { normalizeBarber } from "./normalize";
import type {
  AvailabilityResponse,
  Barber,
  CreateBarberPayload,
  UpdateBarberPayload,
} from "@/lib/booking/types";
import type { RequestOptions } from "./client";

/*
 * Every read and write result passes through `normalizeBarber`, because the
 * detail shape carries two wire-format quirks the declared types hide:
 * `daysOff[].date` is a full ISO datetime and `services[].price` is a Decimal
 * string. See `./normalize.ts`.
 */

/* ----------------------------- Public (customer) ---------------------------- */

/**
 * `GET /api/barbers?serviceId=` — barbers who can perform the given service
 * (active only). Omit `serviceId` for the full active roster.
 */
export async function getBarbers(
  serviceId?: string,
  options?: RequestOptions,
): Promise<Barber[]> {
  const data = await get<{ success: true; barbers: Barber[] }>("/barbers", {
    ...options,
    query: { serviceId, ...options?.query },
  });
  return data.barbers.map(normalizeBarber);
}

/** `GET /api/barbers/:id` */
export async function getBarber(
  id: string,
  options?: RequestOptions,
): Promise<Barber> {
  const data = await get<{ success: true; barber: Barber }>(
    `/barbers/${encodeURIComponent(id)}`,
    options,
  );
  return normalizeBarber(data.barber);
}

/**
 * `GET /api/barbers/:id/availability?serviceId=&date=&excludeAppointmentId=`
 * — a single barber's slots.
 *
 * `excludeAppointmentId` leaves one existing appointment out of the overlap
 * check, so a RESCHEDULE sees the grid as it will be once that appointment has
 * moved — its own time free, and every other time it currently overlaps free
 * too. Without it the appointment blocks itself and the admin is under-offered
 * slots. The write path (`PATCH /api/admin/appointments/:id`) always excludes
 * the row being moved, so this makes the read agree with the write.
 */
export async function getBarberAvailability(
  id: string,
  params: { serviceId: string; date: string; excludeAppointmentId?: string },
  options?: RequestOptions,
): Promise<AvailabilityResponse> {
  return get<AvailabilityResponse>(`/barbers/${encodeURIComponent(id)}/availability`, {
    auth: false,
    ...options,
    query: {
      serviceId: params.serviceId,
      date: params.date,
      excludeAppointmentId: params.excludeAppointmentId,
      ...options?.query,
    },
  });
}

/* --------------------------------- Admin ---------------------------------- */

/**
 * All barbers including inactive ones. There is no separate `/admin/barbers`
 * list route — the admin view is the same public endpoint with
 * `includeInactive=true`, gated server-side by the attached auth token.
 */
export async function getAdminBarbers(options?: RequestOptions): Promise<Barber[]> {
  const data = await get<{ success: true; barbers: Barber[] }>("/barbers", {
    ...options,
    query: { includeInactive: true, ...options?.query },
  });
  return data.barbers.map(normalizeBarber);
}

/** Alias of `getBarber` — same route, named for admin-context call sites. */
export const getAdminBarber = getBarber;

/** `POST /api/admin/barbers` */
export async function createBarber(
  payload: CreateBarberPayload,
  options?: RequestOptions,
): Promise<Barber> {
  const data = await post<{ success: true; barber: Barber }>(
    "/admin/barbers",
    payload,
    options,
  );
  return normalizeBarber(data.barber);
}

/** `PATCH /api/admin/barbers/:id` */
export async function updateBarber(
  id: string,
  payload: UpdateBarberPayload,
  options?: RequestOptions,
): Promise<Barber> {
  const data = await patch<{ success: true; barber: Barber }>(
    `/admin/barbers/${encodeURIComponent(id)}`,
    payload,
    options,
  );
  return normalizeBarber(data.barber);
}

/**
 * `DELETE /api/admin/barbers/:id`
 *
 * Soft-deletes (deactivates) by default. Pass `hard: true` to permanently
 * delete a barber with no appointment history (the backend rejects a hard
 * delete otherwise with a 409 + explanatory message).
 */
export async function deleteBarber(
  id: string,
  opts: { hard?: boolean } & RequestOptions = {},
): Promise<{ message: string; barber?: Barber }> {
  const { hard, ...options } = opts;
  return del<{ message: string; barber?: Barber }>(
    `/admin/barbers/${encodeURIComponent(id)}`,
    { ...options, query: { hard, ...options.query } },
  );
}
