import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireOwner } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import { appointmentDateFilter } from "@/lib/server/commissions";
import { parseRange } from "@/lib/server/commissionQuery";

/**
 * GET /api/dashboard/commissions/summary?from=&to=
 * OWNER only. One entry per worker of the caller's salon, totals built from the
 * stored commission rows (snapshots), never from the worker's current percentage.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireOwner(request);
    if ("error" in auth) return auth.error;
    const range = parseRange(request);
    if ("error" in range) return range.error;

    const [barbers, groups] = await Promise.all([
      prisma.barber.findMany({
        where: { salonId: auth.salonId },
        select: { id: true, name: true, isActive: true, commissionPercentage: true },
        orderBy: { id: "asc" },
      }),
      prisma.workerCommission.groupBy({
        by: ["barberId", "status"],
        where: { salonId: auth.salonId, ...appointmentDateFilter(range.from, range.to) },
        _count: { _all: true },
        _sum: { serviceAmount: true, commissionAmount: true },
      }),
    ]);

    const workers = barbers.map((b) => {
      const mine = groups.filter((g) => g.barberId === b.id);
      const total = (pick: (g: (typeof mine)[number]) => number) => mine.reduce((t, g) => t + pick(g), 0);
      const paid = mine.find((g) => g.status === "PAID");
      const pending = mine.find((g) => g.status === "PENDING");
      return {
        id: b.id,
        name: b.name,
        isActive: b.isActive,
        commissionPercentage: Number(b.commissionPercentage),
        completedServices: total((g) => g._count._all),
        totalServiceAmount: total((g) => Number(g._sum.serviceAmount ?? 0)),
        totalCommission: total((g) => Number(g._sum.commissionAmount ?? 0)),
        pendingCommission: Number(pending?._sum.commissionAmount ?? 0),
        paidCommission: Number(paid?._sum.commissionAmount ?? 0),
        pendingCount: pending?._count._all ?? 0,
      };
    });
    return NextResponse.json({ success: true, workers });
  } catch (error) {
    return handleRouteError(error);
  }
}
