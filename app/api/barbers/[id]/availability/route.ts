import { NextResponse, type NextRequest } from "next/server";

import { AvailabilityError, computeAvailability } from "@/lib/server/availability";
import { handleRouteError } from "@/lib/server/http";

/**
 * GET /api/barbers/:id/availability?serviceId=&date=&excludeAppointmentId=
 *
 * Port of `barberController.getBarberAvailability`, plus the fix M6 asked for.
 *
 * NEW: `excludeAppointmentId`. The engine's `computeAvailability` already
 * accepted it (the reschedule WRITE path has always passed it via
 * `resolveBooking`), but no HTTP route ever exposed it — so the admin
 * reschedule dialog saw the appointment it was moving as a booking blocking its
 * own time, and had to re-enable that one slot client-side while every OTHER
 * slot overlapping the appointment stayed wrongly greyed out. Passing the id
 * here makes the read path agree with the write path.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get("serviceId");
    const date = searchParams.get("date");
    const excludeAppointmentId = searchParams.get("excludeAppointmentId");

    if (!serviceId || !date) {
      return NextResponse.json(
        { success: false, message: "serviceId and date are required." },
        { status: 400 },
      );
    }

    const result = await computeAvailability({
      serviceId,
      barberId: id,
      date,
      excludeAppointmentId: excludeAppointmentId || null,
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
