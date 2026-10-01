import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import { resendAccess } from "@/lib/server/salonRequests";

/**
 * POST /api/platform/requests/:id/resend-access - re-sends the activation link of
 * an approved request whose owner has not set a password yet. Creates no user.
 * SUPER_ADMIN only.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    return NextResponse.json({ success: true, ...(await resendAccess(id, origin)) }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
