import { NextResponse, type NextRequest } from "next/server";

import { getOptionalUser } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import { listServices } from "@/lib/server/services";

/**
 * GET /api/services — active services only, unless a signed-in admin asks for all.
 * Port of `serviceController.listServices` behind the `optional` (soft) gate.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getOptionalUser(request);
    const includeInactive =
      Boolean(user) &&
      String(request.nextUrl.searchParams.get("includeInactive")) === "true";

    const services = await listServices({ includeInactive });
    return NextResponse.json({ success: true, services }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
