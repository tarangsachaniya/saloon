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

/**
 * `GET /api/services` — active services by default. The route is public but
 * "admin-optional": if a valid admin token happens to be attached, passing
 * `query: { includeInactive: true }` (see `getAdminServices`) also works here.
 */
export async function getServices(options?: RequestOptions): Promise<Service[]> {
  const data = await get<{ success: true; services: Service[] }>(
    "/services",
    options,
  );
  return data.services.map(normalizeService);
}

/** `GET /api/services/:id` */
export async function getService(
  id: string,
  options?: RequestOptions,
): Promise<Service> {
  const data = await get<{ success: true; service: Service }>(
    `/services/${encodeURIComponent(id)}`,
    options,
  );
  return normalizeService(data.service);
}

/* --------------------------------- Admin ---------------------------------- */

/**
 * All services including inactive ones. There is no separate `/admin/services`
 * list route — the admin view is the same public endpoint with
 * `includeInactive=true`, gated server-side by the attached auth token
 * (`admin.optional` middleware).
 */
export async function getAdminServices(options?: RequestOptions): Promise<Service[]> {
  const data = await get<{ success: true; services: Service[] }>("/services", {
    ...options,
    query: { includeInactive: true, ...options?.query },
  });
  return data.services.map(normalizeService);
}

/** Alias of `getService` — same route, named for admin-context call sites. */
export const getAdminService = getService;

/** `POST /api/admin/services` */
export async function createService(
  payload: CreateServicePayload,
  options?: RequestOptions,
): Promise<Service> {
  const data = await post<{ success: true; service: Service }>(
    "/admin/services",
    payload,
    options,
  );
  return normalizeService(data.service);
}

/** `PATCH /api/admin/services/:id` */
export async function updateService(
  id: string,
  payload: UpdateServicePayload,
  options?: RequestOptions,
): Promise<Service> {
  const data = await patch<{ success: true; service: Service }>(
    `/admin/services/${encodeURIComponent(id)}`,
    payload,
    options,
  );
  return normalizeService(data.service);
}

/**
 * `DELETE /api/admin/services/:id`
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
    `/admin/services/${encodeURIComponent(id)}`,
    { ...options, query: { hard, ...options.query } },
  );
}
