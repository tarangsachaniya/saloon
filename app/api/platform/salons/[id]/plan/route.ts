import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { describePlan, planData } from "@/lib/server/platform";
import prisma from "@/lib/server/prisma";
import { newPlanSchema } from "@/lib/server/validation/platformValidation";

/**
 * POST /api/platform/salons/:id/plan — change a salon's billing plan.
 *
 * Plans are versioned, never edited: this inserts a new row effective from the
 * given day (default today), so statements for earlier periods keep using the
 * plan that applied then. SUPER_ADMIN only.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const parsed = await parseJsonStrict(request, newPlanSchema);
    if ("error" in parsed) return parsed.error;

    const salon = await prisma.salon.findUnique({ where: { id }, select: { id: true } });
    if (!salon) {
      return NextResponse.json({ success: false, message: "Salon not found." }, { status: 404 });
    }

    // Start of the chosen day (UTC); "now" when no date is given.
    const effectiveFrom = parsed.data.effectiveFrom
      ? new Date(`${parsed.data.effectiveFrom}T00:00:00.000Z`)
      : new Date();

    const plan = await prisma.salonBillingPlan.create({
      data: { salonId: id, effectiveFrom, ...planData(parsed.data.plan) },
    });
    return NextResponse.json({ success: true, plan: { ...plan, summary: describePlan(plan) } }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
