import { ApiError, get, patch, post } from "./client";
import { normalizeAppointment } from "./normalize";
import type {
  AdminAppointmentQuery,
  Appointment,
  CreateAppointmentResult,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from "@/lib/booking/types";
import type { RequestOptions } from "./client";

/* ----------------------------- Public (customer) ---------------------------- */

/**
 * `POST /api/s/:slug/appointments` — create a booking at a salon.
 *
 * Returns the API's discriminated union rather than throwing on a business
 * failure, because "this slot was just taken" is an expected outcome the wizard
 * must render inline. Transport/auth failures still surface as a thrown
 * `ApiError`; a 4xx carrying `{success:false, message}` is normalised into the
 * union so callers only need one code path for business errors.
 *
 * The `message` is opaque — display it, never branch on its text.
 */
export async function createAppointment(
  salonSlug: string,
  payload: CreateAppointmentPayload,
  options?: RequestOptions,
): Promise<CreateAppointmentResult> {
  try {
    const result = await post<CreateAppointmentResult>(`/s/${encodeURIComponent(salonSlug)}/appointments`, payload, {
      auth: false,
      ...options,
    });
    return result.success
      ? { success: true, appointment: normalizeAppointment(result.appointment) }
      : result;
  } catch (error) {
    if (error instanceof ApiError && !error.isNetworkError) {
      const body = error.payload as { success?: boolean; message?: string } | null;
      if (body && typeof body === "object" && body.success === false) {
        return {
          success: false,
          message: body.message ?? error.message,
        };
      }
      // Any other 4xx with a usable message is still a business failure to the
      // customer; 5xx and unparseable bodies keep throwing.
      if (error.status >= 400 && error.status < 500) {
        return { success: false, message: error.message };
      }
    }
    throw error;
  }
}

/* --------------------------------- Admin ---------------------------------- */

/**
 * `GET /api/dashboard/appointments?date=&from=&to=&barberId=&status=`
 *
 * `from`/`to` give an inclusive date range; the backend ignores them whenever
 * `date` is supplied. Results come back ordered by date then start time.
 */
export async function getAdminAppointments(
  query: AdminAppointmentQuery = {},
  options?: RequestOptions,
): Promise<Appointment[]> {
  const data = await get<{ success: true; appointments: Appointment[] }>(
    "/dashboard/appointments",
    {
      ...options,
      query: {
        date: query.date,
        from: query.from,
        to: query.to,
        barberId: query.barberId,
        status: query.status,
        ...options?.query,
      },
    },
  );
  return data.appointments.map(normalizeAppointment);
}

/** `GET /api/dashboard/appointments/:id` */
export async function getAdminAppointment(
  id: string,
  options?: RequestOptions,
): Promise<Appointment> {
  const data = await get<{ success: true; appointment: Appointment }>(
    `/dashboard/appointments/${encodeURIComponent(id)}`,
    options,
  );
  return normalizeAppointment(data.appointment);
}

/** `PATCH /api/dashboard/appointments/:id` — status changes, reschedules, notes. */
export async function updateAppointment(
  id: string,
  payload: UpdateAppointmentPayload,
  options?: RequestOptions,
): Promise<Appointment> {
  const data = await patch<{ success: true; appointment: Appointment }>(
    `/dashboard/appointments/${encodeURIComponent(id)}`,
    payload,
    options,
  );
  return normalizeAppointment(data.appointment);
}

/** Convenience wrapper for the most common admin mutation. */
export function updateAppointmentStatus(
  id: string,
  status: UpdateAppointmentPayload["status"],
  options?: RequestOptions,
): Promise<Appointment> {
  return updateAppointment(id, { status }, options);
}
