import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireOwner } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { isValidPercentage } from "@/lib/server/commissions";

/**
 * PATCH /api/dashboard/barbers/[id]/commission { commissionPercentage }
 *
 * OWNER only. The worker must belong to the caller's salon (salon comes from
 * the verified user, never the request). Affects FUTURE completions only: rows
 * already in WorkerCommission keep the percentage they were snapshotted with.
 */

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOwner(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const parsed = await parseJsonBody<{ commissionPercentage?: unknown }>(request);
    if ("error" in parsed) return parsed.error;
    const value = parsed.body.commissionPercentage;
    if (!isValidPercentage(value)) {
      return NextResponse.json(
        { success: false, message: "Commission must be a number from 0 to 100 (up to 2 decimals)." },
        { status: 400 },
      );
    }

    const { count } = await prisma.barber.updateMany({
      where: { id, salonId: auth.salonId },
      data: { commissionPercentage: value },
    });
    if (count === 0) {
      return NextResponse.json({ success: false, message: "Worker not found." }, { status: 404 });
    }
    const barber = await prisma.barber.findFirstOrThrow({
      where: { id, salonId: auth.salonId },
      select: { id: true, name: true, commissionPercentage: true },
    });
    return NextResponse.json({
      success: true,
      barber: { id: barber.id, name: barber.name, commissionPercentage: Number(barber.commissionPercentage) },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
