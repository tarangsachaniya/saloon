import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import prisma from "@/lib/server/prisma";
import { serializeRequest, statusesFor, type RequestStatus } from "@/lib/server/salonRequests";

/**
 * GET /api/platform/requests?status=PENDING|APPROVED|REJECTED (default: all)
 * Salon listing requests from the public "List your salon" form, newest first,
 * plus per-status counts and how many pending ones the admin has not opened yet
 * (the notification badge). SUPER_ADMIN only.
 */

export const dynamic = "force-dynamic";

const STATUSES: RequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const wanted = request.nextUrl.searchParams.get("status")?.toUpperCase() as RequestStatus | undefined;
    const where = wanted && STATUSES.includes(wanted) ? { status: { in: statusesFor(wanted) } } : {};

    const [rows, pending, approved, rejected, unseen] = await Promise.all([
      prisma.platformLead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { salon: { select: { id: true, slug: true, name: true } } },
      }),
      prisma.platformLead.count({ where: { status: { in: statusesFor("PENDING") } } }),
      prisma.platformLead.count({ where: { status: { in: statusesFor("APPROVED") } } }),
      prisma.platformLead.count({ where: { status: { in: statusesFor("REJECTED") } } }),
      prisma.platformLead.count({ where: { status: { in: statusesFor("PENDING") }, adminSeenAt: null } }),
    ]);

    return NextResponse.json(
      { success: true, requests: rows.map(serializeRequest), counts: { pending, approved, rejected, unseen } },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
