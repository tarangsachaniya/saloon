import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireOwner } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import { appointmentDateFilter } from "@/lib/server/commissions";
import { parseRange } from "@/lib/server/commissionQuery";

/**
 * GET /api/dashboard/commissions/summary?from=&to=
 * OWNER only. One entry per worker of the caller's salon, totals built from the
 * stored commission rows (snapshots), never from the worker's current rate.
 * Online bookings and walk-ins both earn commission; they are counted apart.
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
        select: {
          id: true,
          name: true,
          isActive: true,
          commissionPercentage: true,
          commissionType: true,
          commissionFlatAmount: true,
        },
        orderBy: { id: "asc" },
      }),
      prisma.workerCommission.groupBy({
        by: ["barberId", "status", "source"],
        where: { salonId: auth.salonId, ...appointmentDateFilter(range.from, range.to) },
        _count: { _all: true },
        _sum: { serviceAmount: true, commissionAmount: true },
      }),
    ]);

    const workers = barbers.map((b) => {
      const mine = groups.filter((g) => g.barberId === b.id);
      const total = (pick: (g: (typeof mine)[number]) => number) => mine.reduce((t, g) => t + pick(g), 0);
      type Group = (typeof mine)[number];
      const sumWhere = (keep: (g: Group) => boolean, pick: (g: Group) => number) =>
        mine.filter(keep).reduce((t, g) => t + pick(g), 0);
      const amount = (g: Group) => Number(g._sum.commissionAmount ?? 0);
      const count = (g: Group) => g._count._all;
      return {
        id: b.id,
        name: b.name,
        isActive: b.isActive,
        commissionType: b.commissionType,
        commissionPercentage: Number(b.commissionPercentage),
        commissionFlatAmount: Number(b.commissionFlatAmount),
        completedServices: total((g) => g._count._all),
        totalServiceAmount: total((g) => Number(g._sum.serviceAmount ?? 0)),
        totalCommission: total((g) => Number(g._sum.commissionAmount ?? 0)),
        pendingCommission: sumWhere((g) => g.status === "PENDING", amount),
        paidCommission: sumWhere((g) => g.status === "PAID", amount),
        pendingCount: sumWhere((g) => g.status === "PENDING", count),
        onlineCount: sumWhere((g) => g.source === "ONLINE", count),
        walkInCount: sumWhere((g) => g.source === "WALK_IN", count),
      };
    });
    return NextResponse.json({ success: true, workers });
  } catch (error) {
    return handleRouteError(error);
  }
}
