import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { getOptionalStaff } from "@/lib/server/auth";
import { resolveSalon } from "@/lib/server/salon";
import { handleRouteError } from "@/lib/server/http";
import { BARBER_DETAIL_INCLUDE } from "@/lib/server/barbers";

/**
 * GET /api/barbers/:id — port of `barberController.getBarber` behind the
 * `optional` (soft) gate: an inactive barber is a 404 to the public and
 * visible to a signed-in admin.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { id, slug } = await params;
    const gate = await resolveSalon(Promise.resolve({ slug }));
    if ("error" in gate) return gate.error;
    const salon = gate.salon;
    const user = await getOptionalStaff(request, salon.id);

    const barber = await prisma.barber.findFirst({
      where: { id, salonId: salon.id },
      include: BARBER_DETAIL_INCLUDE,
    });
    if (!barber || (!barber.isActive && !user)) {
      return NextResponse.json(
        { success: false, message: "Barber not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, barber }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
