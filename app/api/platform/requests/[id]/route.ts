import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import prisma from "@/lib/server/prisma";
import { serializeRequest } from "@/lib/server/salonRequests";

/**
 * GET /api/platform/requests/:id - full details of one request. Opening it marks
 * the "new request" notification as seen (once). SUPER_ADMIN only.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    await prisma.platformLead.updateMany({ where: { id, adminSeenAt: null }, data: { adminSeenAt: new Date() } });
    const lead = await prisma.platformLead.findUnique({
      where: { id },
      include: { salon: { select: { id: true, slug: true, name: true } } },
    });
    if (!lead) return NextResponse.json({ success: false, message: "Salon request not found." }, { status: 404 });
    return NextResponse.json({ success: true, request: serializeRequest(lead) }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
