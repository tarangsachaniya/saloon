import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireOwner } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import { appointmentDateFilter } from "@/lib/server/commissions";
import { parseRange } from "@/lib/server/commissionQuery";

/**
 * GET /api/dashboard/commissions?barberId=&status=&source=&from=&to=
 * OWNER only. Commission history (newest appointment first, max 200), scoped to
 * the caller's salon. Service name and date come from the real appointment.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireOwner(request);
    if ("error" in auth) return auth.error;
    const range = parseRange(request);
    if ("error" in range) return range.error;

    const q = request.nextUrl.searchParams;
    const barberId = q.get("barberId");
    const rawStatus = q.get("status");
    const status = rawStatus === "PENDING" || rawStatus === "PAID" ? rawStatus : null;
    if (rawStatus && !status) {
      return NextResponse.json({ success: false, message: "Invalid status." }, { status: 400 });
    }
    const rawSource = q.get("source");
    const source = rawSource === "ONLINE" || rawSource === "WALK_IN" ? rawSource : null;
    if (rawSource && !source) {
      return NextResponse.json({ success: false, message: "Invalid source." }, { status: 400 });
    }
    if (barberId) {
      const own = await prisma.barber.findFirst({ where: { id: barberId, salonId: auth.salonId }, select: { id: true } });
      if (!own) return NextResponse.json({ success: false, message: "Worker not found." }, { status: 404 });
    }

    const rows = await prisma.workerCommission.findMany({
      where: {
        salonId: auth.salonId,
        ...(barberId ? { barberId } : {}),
        ...(status ? { status } : {}),
        ...(source ? { source } : {}),
        ...appointmentDateFilter(range.from, range.to),
      },
      include: {
        appointment: {
          select: {
            appointmentDate: true,
            startTime: true,
            service: { select: { name: true } },
            services: { select: { name: true }, orderBy: { sortOrder: "asc" } },
          },
        },
        barber: { select: { name: true } },
      },
      orderBy: [{ appointment: { appointmentDate: "desc" } }, { appointment: { startTime: "desc" } }],
      take: 200,
    });

    return NextResponse.json({
      success: true,
      commissions: rows.map((r) => ({
        id: r.id,
        appointmentId: r.appointmentId,
        barberId: r.barberId,
        barberName: r.barber.name,
        serviceName: r.appointment.services.length
          ? r.appointment.services.map((s) => s.name).join(" + ")
          : r.appointment.service.name,
        source: r.source,
        commissionType: r.commissionType,
        flatAmount: Number(r.flatAmount),
        serviceCount: r.serviceCount,
        date: r.appointment.appointmentDate.toISOString().slice(0, 10),
        commissionPercentage: Number(r.commissionPercentage),
        serviceAmount: Number(r.serviceAmount),
        commissionAmount: Number(r.commissionAmount),
        status: r.status,
        paidAt: r.paidAt,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
