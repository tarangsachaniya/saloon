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
 * `GET /api/s/:slug/barbers?serviceIds=` — a salon's barbers who can perform
 * EVERY given service (active only). Omit it for the full active roster.
 */
export async function getBarbers(
  salonSlug: string,
  serviceIds?: string | string[],
  options?: RequestOptions,
): Promise<Barber[]> {
  const ids = typeof serviceIds === "string" ? [serviceIds] : serviceIds;
  const data = await get<{ success: true; barbers: Barber[] }>(
    `/s/${encodeURIComponent(salonSlug)}/barbers`,
    { auth: false, ...options, query: { serviceIds: ids?.length ? ids.join(",") : undefined, ...options?.query } },
  );
  return data.barbers.map(normalizeBarber);
}

/** `GET /api/s/:slug/barbers/:id` */
export async function getBarber(
  salonSlug: string,
  id: string,
  options?: RequestOptions,
): Promise<Barber> {
  const data = await get<{ success: true; barber: Barber }>(
    `/s/${encodeURIComponent(salonSlug)}/barbers/${encodeURIComponent(id)}`,
    { auth: false, ...options },
  );
  return normalizeBarber(data.barber);
}

/**
 * `GET /api/dashboard/barbers/:id/availability?serviceIds=&date=&excludeAppointmentId=`
 * — a single barber's slots for the signed-in staff's salon (reschedule dialog).
 *
 * `excludeAppointmentId` leaves one existing appointment out of the overlap
 * check, so a RESCHEDULE sees the grid as it will be once that appointment has
 * moved — its own time free, and every other time it currently overlaps free
 * too. Without it the appointment blocks itself and the admin is under-offered
 * slots. The write path (`PATCH /api/dashboard/appointments/:id`) always excludes
 * the row being moved, so this makes the read agree with the write.
 */
export async function getAdminBarberAvailability(
  id: string,
  params: { serviceIds: string[]; date: string; excludeAppointmentId?: string },
  options?: RequestOptions,
): Promise<AvailabilityResponse> {
  return get<AvailabilityResponse>(`/dashboard/barbers/${encodeURIComponent(id)}/availability`, {
    ...options,
    query: {
      serviceIds: params.serviceIds.join(","),
      date: params.date,
      excludeAppointmentId: params.excludeAppointmentId,
      ...options?.query,
    },
  });
}

/* --------------------------------- Admin ---------------------------------- */

/**
 * `GET /api/dashboard/barbers` — every barber of the signed-in staff's salon,
 * inactive included.
 */
export async function getAdminBarbers(options?: RequestOptions): Promise<Barber[]> {
  const data = await get<{ success: true; barbers: Barber[] }>(
    "/dashboard/barbers",
    options,
  );
  return data.barbers.map(normalizeBarber);
}

/** `GET /api/dashboard/barbers/:id` — full detail incl. schedule. */
export async function getAdminBarber(
  id: string,
  options?: RequestOptions,
): Promise<Barber> {
  const data = await get<{ success: true; barber: Barber }>(
    `/dashboard/barbers/${encodeURIComponent(id)}`,
    options,
  );
  return normalizeBarber(data.barber);
}

/** `POST /api/dashboard/barbers` */
export async function createBarber(
  payload: CreateBarberPayload,
  options?: RequestOptions,
): Promise<Barber> {
  const data = await post<{ success: true; barber: Barber }>(
    "/dashboard/barbers",
    payload,
    options,
  );
  return normalizeBarber(data.barber);
}

/** `PATCH /api/dashboard/barbers/:id` */
export async function updateBarber(
  id: string,
  payload: UpdateBarberPayload,
  options?: RequestOptions,
): Promise<Barber> {
  const data = await patch<{ success: true; barber: Barber }>(
    `/dashboard/barbers/${encodeURIComponent(id)}`,
    payload,
    options,
  );
  return normalizeBarber(data.barber);
}

/**
 * `DELETE /api/dashboard/barbers/:id`
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
    `/dashboard/barbers/${encodeURIComponent(id)}`,
    { ...options, query: { hard, ...options.query } },
  );
}
