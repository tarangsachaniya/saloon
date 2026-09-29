import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { currentPlan, describePlan, PlatformConflictError, SALON_DETAIL_INCLUDE } from "@/lib/server/platform";
import prisma from "@/lib/server/prisma";
import { updateSalonSchema } from "@/lib/server/validation/platformValidation";

/**
 * GET   /api/platform/salons/:id — salon, team logins, plan history, counts.
 * PATCH /api/platform/salons/:id — edit profile/theme, or activate/deactivate.
 * SUPER_ADMIN only.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadDetail(id: string) {
  const salon = await prisma.salon.findUnique({
    where: { id },
    include: {
      ...SALON_DETAIL_INCLUDE,
      _count: { select: { appointments: true, barbers: true, services: true, clients: true } },
    },
  });
  if (!salon) return null;

  const { billingPlans, users, _count, ...rest } = salon;
  const now = new Date();
  const active = currentPlan(billingPlans, now);
  return {
    ...rest,
    team: users,
    counts: _count,
    plans: billingPlans.map((p) => ({
      ...p,
      summary: describePlan(p),
      status: p === active ? "CURRENT" : p.effectiveFrom > now ? "SCHEDULED" : "PAST",
    })),
  };
}

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const salon = await loadDetail(id);
    if (!salon) {
      return NextResponse.json({ success: false, message: "Salon not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, salon }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const parsed = await parseJsonStrict(request, updateSalonSchema);
    if ("error" in parsed) return parsed.error;
    const data = parsed.data as Record<string, unknown>;

    const existing = await prisma.salon.findUnique({ where: { id }, select: { slug: true } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Salon not found." }, { status: 404 });
    }
    if (typeof data.slug === "string" && data.slug !== existing.slug) {
      const taken = await prisma.salon.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (taken) throw new PlatformConflictError(`The address /s/${data.slug} is already taken.`);
    }
    if (typeof data.accentColor === "string") data.accentColor = data.accentColor.toLowerCase();
    // Empty optional strings are stored as null, not "".
    for (const key of ["tagline", "about", "phone", "email", "address", "mapUrl"]) {
      if (data[key] === "") data[key] = null;
    }

    await prisma.salon.update({ where: { id }, data });
    return NextResponse.json({ success: true, salon: await loadDetail(id) }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
