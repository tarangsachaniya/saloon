import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { AvailabilityError, computeAvailability, serviceIdsFromQuery } from "@/lib/server/availability";
import { handleRouteError } from "@/lib/server/http";

/**
 * GET /api/dashboard/barbers/:id/availability?serviceIds=&date=&excludeAppointmentId=
 *
 * The reschedule dialog's slot grid. Same engine as the public route, but the
 * salon comes from the signed-in staff member rather than a URL slug, so it
 * also works for a salon that is not public.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const serviceIds = serviceIdsFromQuery(searchParams);
    const date = searchParams.get("date");
    const excludeAppointmentId = searchParams.get("excludeAppointmentId");

    if (serviceIds.length === 0 || !date) {
      return NextResponse.json(
        { success: false, message: "serviceIds and date are required." },
        { status: 400 },
      );
    }

    const result = await computeAvailability({
      salonId: auth.salonId,
      serviceIds,
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
