import { NextResponse, type NextRequest } from "next/server";

import { getOptionalUser } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import { getServiceById } from "@/lib/server/services";

/**
 * GET /api/services/:id
 * Port of `serviceController.getService` behind the `optional` (soft) gate —
 * an inactive service is a 404 to the public, visible to a signed-in admin.
 *
 * NOTE: `params` is a Promise in this version of Next.js and must be awaited.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getOptionalUser(request);

    const service = await getServiceById(id);
    if (!service || (!service.isActive && !user)) {
      return NextResponse.json(
        { success: false, message: "Service not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, service }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
