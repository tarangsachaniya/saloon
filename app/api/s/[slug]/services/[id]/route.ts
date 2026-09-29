import { NextResponse, type NextRequest } from "next/server";

import { getOptionalStaff } from "@/lib/server/auth";
import { resolveSalon } from "@/lib/server/salon";
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
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { id, slug } = await params;
    const gate = await resolveSalon(Promise.resolve({ slug }));
    if ("error" in gate) return gate.error;
    const salon = gate.salon;
    const user = await getOptionalStaff(request, salon.id);

    const service = await getServiceById(salon.id, id);
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
