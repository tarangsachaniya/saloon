import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { rejectRequest } from "@/lib/server/salonRequests";

/** POST /api/platform/requests/:id/reject { reason? } - SUPER_ADMIN only. Creates no salon, account or credentials. */

export const dynamic = "force-dynamic";

const bodySchema = z.object({ reason: z.string().trim().max(500).optional().nullable() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonStrict(request, bodySchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const updated = await rejectRequest(id, parsed.data.reason || null);
    return NextResponse.json({ success: true, request: updated }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
