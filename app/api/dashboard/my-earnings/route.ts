import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import { appointmentDateFilter } from "@/lib/server/commissions";
import { parseRange } from "@/lib/server/commissionQuery";

/**
 * GET /api/dashboard/my-earnings?from=&to=
 * A worker's OWN commission: the signed-in STAFF user must be linked to a
 * worker (owner-created login). Totals plus the latest 200 records. Never
 * another worker's data, whatever the query says.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;
    const barberId = auth.user.barberId;
    if (!barberId) {
      return NextResponse.json({ success: false, message: "This login is not linked to a worker." }, { status: 404 });
    }
    const range = parseRange(request);
    if ("error" in range) return range.error;

    const where = { salonId: auth.salonId, barberId, ...appointmentDateFilter(range.from, range.to) };
    const [barber, rows] = await Promise.all([
      prisma.barber.findFirst({
        where: { id: barberId, salonId: auth.salonId },
        select: { id: true, name: true, commissionType: true, commissionPercentage: true, commissionFlatAmount: true },
      }),
      prisma.workerCommission.findMany({
        where,
        include: {
          appointment: {
            select: {
              appointmentDate: true,
              service: { select: { name: true } },
              services: { select: { name: true }, orderBy: { sortOrder: "asc" } },
            },
          },
        },
        orderBy: [{ appointment: { appointmentDate: "desc" } }, { appointment: { startTime: "desc" } }],
        take: 200,
      }),
    ]);
    if (!barber) return NextResponse.json({ success: false, message: "Worker not found." }, { status: 404 });

    const sum = (keep: (r: (typeof rows)[number]) => boolean) =>
      rows.filter(keep).reduce((t, r) => t + Number(r.commissionAmount), 0);

    return NextResponse.json({
      success: true,
      worker: {
        id: barber.id,
        name: barber.name,
        commissionType: barber.commissionType,
        commissionPercentage: Number(barber.commissionPercentage),
        commissionFlatAmount: Number(barber.commissionFlatAmount),
        completedServices: rows.length,
        onlineCount: rows.filter((r) => r.source === "ONLINE").length,
        walkInCount: rows.filter((r) => r.source === "WALK_IN").length,
        totalCommission: sum(() => true),
        pendingCommission: sum((r) => r.status === "PENDING"),
        paidCommission: sum((r) => r.status === "PAID"),
      },
      commissions: rows.map((r) => ({
        id: r.id,
        serviceName: r.appointment.services.length
          ? r.appointment.services.map((s) => s.name).join(" + ")
          : r.appointment.service.name,
        date: r.appointment.appointmentDate.toISOString().slice(0, 10),
        source: r.source,
        serviceAmount: Number(r.serviceAmount),
        commissionAmount: Number(r.commissionAmount),
        status: r.status,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
