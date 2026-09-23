import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { getOptionalUser } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";

/**
 * GET /api/barbers — customer-facing list. Port of `barberController.listBarbers`
 * behind the `optional` (soft) gate.
 *
 * `?serviceId=` filters to barbers actually qualified for that service, which
 * is what makes an unqualified barber disappear from the booking wizard.
 * `?includeInactive=true` is honoured only for a signed-in admin.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getOptionalUser(request);
    const serviceId = request.nextUrl.searchParams.get("serviceId");
    const includeInactive =
      Boolean(user) &&
      String(request.nextUrl.searchParams.get("includeInactive")) === "true";

    const barbers = await prisma.barber.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(serviceId ? { services: { some: { id: serviceId } } } : {}),
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
