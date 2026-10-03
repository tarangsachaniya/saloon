import { NextResponse, type NextRequest } from "next/server";

import {
  AvailabilityError,
  computeAvailability,
  isValidDateString,
  serviceIdsFromQuery,
} from "@/lib/server/availability";
import { handleRouteError } from "@/lib/server/http";
import { resolveSalon } from "@/lib/server/salon";


/**
 * GET /api/s/[slug]/availability?serviceIds=&barberId=&date=&excludeAppointmentId=
 *
 * Port of `availabilityController.getAvailability`. `barberId` is optional and
 * defaults to "any".
 *
 * NEW: `excludeAppointmentId`, for the same reason as on the single-barber
 * route — a reschedule must not see the appointment it is moving as a blocker.
 * Exposed here too so an "any barber" reschedule can use the same grid the
 * write path will re-derive.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const gate = await resolveSalon(params);
    if ("error" in gate) return gate.error;
    const salon = gate.salon;

    const searchParams = request.nextUrl.searchParams;
    const serviceIds = serviceIdsFromQuery(searchParams);
    const date = searchParams.get("date");
    const barberId = searchParams.get("barberId") || "any";
    const excludeAppointmentId = searchParams.get("excludeAppointmentId");

    if (serviceIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "serviceIds is required." },
        { status: 400 },
      );
    }
    if (!date) {
      return NextResponse.json(
        { success: false, message: "date is required." },
        { status: 400 },
      );
    }
    if (!isValidDateString(date)) {
      return NextResponse.json(
        { success: false, message: "Invalid date. Expected format YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const result = await computeAvailability({
      salonId: salon.id,
      serviceIds,
      barberId,
      date,
      excludeAppointmentId: excludeAppointmentId || null,
      // The customer wizard never passes an appointment to exclude; staff
      // rescheduling does, and may move an appointment on an inactive service.
      bookableOnly: !excludeAppointmentId,
      onlineBooking: !excludeAppointmentId,
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    return handleRouteError(error);
  }
}
