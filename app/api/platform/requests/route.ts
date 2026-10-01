import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import prisma from "@/lib/server/prisma";
import { serializeRequest } from "@/lib/server/salonRequests";

/**
 * GET /api/platform/requests - salon listing requests from the public "List your
 * salon" form, newest first, with how many the admin has not opened yet (the
 * notification badge). Read-only; SUPER_ADMIN only.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const [rows, total, unseen] = await Promise.all([
      prisma.platformLead.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.platformLead.count(),
      prisma.platformLead.count({ where: { adminSeenAt: null } }),
    ]);

    return NextResponse.json(
      { success: true, requests: rows.map(serializeRequest), counts: { total, unseen } },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
