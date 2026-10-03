import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { getOptionalStaff } from "@/lib/server/auth";
import { resolveSalon } from "@/lib/server/salon";
import { handleRouteError } from "@/lib/server/http";
import { serviceIdsFromQuery } from "@/lib/server/availability";

/**
 * GET /api/barbers — customer-facing list. Port of `barberController.listBarbers`
 * behind the `optional` (soft) gate.
 *
 * `?serviceIds=a,b` (or legacy `?serviceId=`) filters to barbers qualified for
 * EVERY listed service, which is what makes an unqualified barber disappear
 * from the booking wizard.
 * `?includeInactive=true` is honoured only for this salon's signed-in staff.
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

    const user = await getOptionalStaff(request, salon.id);
    const serviceIds = serviceIdsFromQuery(request.nextUrl.searchParams);
    const includeInactive =
      Boolean(user) &&
      String(request.nextUrl.searchParams.get("includeInactive")) === "true";

    const barbers = await prisma.barber.findMany({
      where: {
        salonId: salon.id,
        // The public list is what customers pre-book from: walk-in-only workers are hidden.
        ...(includeInactive ? {} : { isActive: true, onlineBookingEnabled: true }),
        ...(serviceIds.length ? { AND: serviceIds.map((id) => ({ services: { some: { id } } })) } : {}),
      },
      orderBy: { id: "asc" },
      include: {
        services: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, barbers }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
