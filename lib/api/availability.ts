import { get } from "./client";
import type {
  AvailabilityQuery,
  AvailabilityResponse,
  Slot,
} from "@/lib/booking/types";
import type { RequestOptions } from "./client";

/**
 * `GET /api/availability?serviceId=&barberId=&date=&excludeAppointmentId=`
 *
 * `barberId` may be a concrete id or the literal "any" (see `ANY_BARBER`).
 * `date` must be "YYYY-MM-DD".
 *
 * Slots are returned for the whole trading day with an `available` flag, so the
 * UI can render unavailable times greyed out rather than hiding them.
 *
 * `excludeAppointmentId` (optional) leaves one existing appointment out of the
 * overlap check — for a reschedule, so the appointment being moved does not
 * block its own time. See `getBarberAvailability` for the full story; the
 * single-barber route is what the admin reschedule dialog actually uses, this
 * parameter exists here for parity (an "any barber" reschedule).
 */
export function getAvailability(
  params: AvailabilityQuery & { excludeAppointmentId?: string },
  options?: RequestOptions,
): Promise<AvailabilityResponse> {
  return get<AvailabilityResponse>("/availability", {
    auth: false,
    ...options,
    query: {
      serviceId: params.serviceId,
      barberId: params.barberId,
      date: params.date,
      excludeAppointmentId: params.excludeAppointmentId,
      ...options?.query,
    },
  });
}

/** Convenience: only the bookable slots from an availability response. */
export function selectBookableSlots(response: AvailabilityResponse): Slot[] {
  return response.slots.filter((slot) => slot.available);
}
