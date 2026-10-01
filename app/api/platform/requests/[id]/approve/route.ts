import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { approveRequest } from "@/lib/server/salonRequests";
import { billingPlanSchema, slugSchema } from "@/lib/server/validation/platformValidation";

/**
 * POST /api/platform/requests/:id/approve { plan, slug?, ownerEmail? }
 *
 * SUPER_ADMIN only. Creates the salon + OWNER login + billing plan and emails a
 * one-time activation link (never a password). Idempotent: a repeat, a refresh or
 * a second admin gets 409 and creates nothing. The activation link is also
 * returned (to this admin only) so access can be shared if email is not delivered.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  plan: billingPlanSchema,
  slug: slugSchema.optional(),
  ownerEmail: z.email().max(180).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonStrict(request, bodySchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const result = await approveRequest(id, parsed.data, origin);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
