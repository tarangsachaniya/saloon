import { NextResponse, type NextRequest } from "next/server";

import { getOptionalStaff } from "@/lib/server/auth";
import { resolveSalon } from "@/lib/server/salon";
import { handleRouteError } from "@/lib/server/http";
import { listServices } from "@/lib/server/services";

/**
 * GET /api/services — active services only, unless a signed-in admin asks for all.
 * Port of `serviceController.listServices` behind the `optional` (soft) gate.
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
    const includeInactive =
      Boolean(user) &&
      String(request.nextUrl.searchParams.get("includeInactive")) === "true";

    const services = await listServices(salon.id, { includeInactive });
    return NextResponse.json({ success: true, services }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
