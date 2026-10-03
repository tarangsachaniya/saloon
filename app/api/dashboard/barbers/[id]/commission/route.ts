import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireOwner } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { isValidFlatAmount, isValidPercentage } from "@/lib/server/commissions";

/**
 * PATCH /api/dashboard/barbers/[id]/commission
 *   { commissionType: "PERCENT", commissionPercentage }   share of the amount charged
 *   { commissionType: "FLAT", commissionFlatAmount }      fixed amount per service
 *   { commissionPercentage }                              (older clients) = PERCENT
 *
 * OWNER only. The worker must belong to the caller's salon (salon comes from
 * the verified user, never the request). Affects FUTURE completions only: rows
 * already in WorkerCommission keep the rule they were snapshotted with.
 */

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOwner(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const parsed = await parseJsonBody<{
      commissionType?: unknown;
      commissionPercentage?: unknown;
      commissionFlatAmount?: unknown;
    }>(request);
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;
    const type = body.commissionType ?? "PERCENT";

    let data: { commissionType: "PERCENT" | "FLAT"; commissionPercentage?: number; commissionFlatAmount?: number };
    if (type === "PERCENT") {
      if (!isValidPercentage(body.commissionPercentage)) {
        return NextResponse.json(
          { success: false, message: "Commission must be a number from 0 to 100 (up to 2 decimals)." },
          { status: 400 },
        );
      }
      data = { commissionType: "PERCENT", commissionPercentage: body.commissionPercentage };
    } else if (type === "FLAT") {
      if (!isValidFlatAmount(body.commissionFlatAmount)) {
        return NextResponse.json(
          { success: false, message: "Flat commission must be an amount of 0 or more (up to 2 decimals)." },
          { status: 400 },
        );
      }
      data = { commissionType: "FLAT", commissionFlatAmount: body.commissionFlatAmount };
    } else {
      return NextResponse.json({ success: false, message: "commissionType must be PERCENT or FLAT." }, { status: 400 });
    }

    const { count } = await prisma.barber.updateMany({
      where: { id, salonId: auth.salonId },
      data,
    });
    if (count === 0) {
      return NextResponse.json({ success: false, message: "Worker not found." }, { status: 404 });
    }
    const barber = await prisma.barber.findFirstOrThrow({
      where: { id, salonId: auth.salonId },
      select: { id: true, name: true, commissionPercentage: true, commissionType: true, commissionFlatAmount: true },
    });
    return NextResponse.json({
      success: true,
      barber: {
        id: barber.id,
        name: barber.name,
        commissionType: barber.commissionType,
        commissionPercentage: Number(barber.commissionPercentage),
        commissionFlatAmount: Number(barber.commissionFlatAmount),
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
