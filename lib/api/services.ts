import { del, get, patch, post } from "./client";
import { normalizeService } from "./normalize";
import type {
  CreateServicePayload,
  Service,
  UpdateServicePayload,
} from "@/lib/booking/types";
import type { RequestOptions } from "./client";

/*
 * The backend wraps every response in `{success, ...}`. These functions
 * unwrap it so callers work with plain domain objects/arrays, matching the
 * documented function signatures.
 *
 * Every read also runs through `normalizeService`, because the API serialises
 * the Prisma `Decimal` price column as a string ("300") — see `./normalize.ts`.
 */

/* ----------------------------- Public (customer) ---------------------------- */

/** `GET /api/s/:slug/services` — a salon's active services. */
export async function getServices(
  salonSlug: string,
  options?: RequestOptions,
): Promise<Service[]> {
  const data = await get<{ success: true; services: Service[] }>(
    `/s/${encodeURIComponent(salonSlug)}/services`,
    { auth: false, ...options },
  );
  return data.services.map(normalizeService);
}

/** `GET /api/s/:slug/services/:id` */
export async function getService(
  salonSlug: string,
  id: string,
  options?: RequestOptions,
): Promise<Service> {
  const data = await get<{ success: true; service: Service }>(
    `/s/${encodeURIComponent(salonSlug)}/services/${encodeURIComponent(id)}`,
    { auth: false, ...options },
  );
  return normalizeService(data.service);
}

/* --------------------------------- Admin ---------------------------------- */

/**
 * `GET /api/dashboard/services` — every service of the signed-in staff's salon,
 * inactive included. The salon comes from the token, not the URL.
 */
export async function getAdminServices(options?: RequestOptions): Promise<Service[]> {
  const data = await get<{ success: true; services: Service[] }>(
    "/dashboard/services",
    options,
  );
  return data.services.map(normalizeService);
}

/** `POST /api/dashboard/services` */
export async function createService(
  payload: CreateServicePayload,
  options?: RequestOptions,
): Promise<Service> {
  const data = await post<{ success: true; service: Service }>(
    "/dashboard/services",
    payload,
    options,
  );
  return normalizeService(data.service);
}

/** `PATCH /api/dashboard/services/:id` */
export async function updateService(
  id: string,
  payload: UpdateServicePayload,
  options?: RequestOptions,
): Promise<Service> {
  const data = await patch<{ success: true; service: Service }>(
    `/dashboard/services/${encodeURIComponent(id)}`,
    payload,
    options,
  );
  return normalizeService(data.service);
}

/**
 * `DELETE /api/dashboard/services/:id`
 *
 * Soft-deletes (deactivates) by default. Pass `hard: true` to permanently
 * delete a service with no appointment history (the backend rejects a hard
 * delete otherwise with a 409 + explanatory message).
 */
export async function deleteService(
  id: string,
  opts: { hard?: boolean } & RequestOptions = {},
): Promise<{ message: string; service?: Service }> {
  const { hard, ...options } = opts;
  return del<{ message: string; service?: Service }>(
    `/dashboard/services/${encodeURIComponent(id)}`,
    { ...options, query: { hard, ...options.query } },
  );
}
