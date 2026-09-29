import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { createSalonWithOwner, currentPlan, describePlan } from "@/lib/server/platform";
import prisma from "@/lib/server/prisma";
import { createSalonSchema } from "@/lib/server/validation/platformValidation";

/**
 * GET  /api/platform/salons — every salon with owner, current plan and counts.
 * POST /api/platform/salons — create a salon + owner login + first billing plan.
 *
 * SUPER_ADMIN only. The POST response carries the owner's temporary password
 * ONCE (email is not wired up yet); only its hash is stored.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const salons = await prisma.salon.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        billingPlans: { orderBy: { effectiveFrom: "desc" } },
        users: {
          where: { role: "OWNER" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { firstName: true, lastName: true, email: true },
        },
        _count: { select: { appointments: true, barbers: true, services: true } },
      },
    });

    const now = new Date();
    const rows = salons.map(({ billingPlans, users, _count, ...salon }) => {
      const plan = currentPlan(billingPlans, now);
      return {
        ...salon,
        owner: users[0] ?? null,
        plan: plan ? { ...plan, summary: describePlan(plan) } : null,
        counts: _count,
      };
    });

    return NextResponse.json({ success: true, salons: rows }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonStrict(request, createSalonSchema);
    if ("error" in parsed) return parsed.error;

    const { salon, credentials } = await createSalonWithOwner(parsed.data);
    return NextResponse.json({ success: true, salon, credentials }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
