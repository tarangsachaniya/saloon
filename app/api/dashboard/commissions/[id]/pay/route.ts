import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireOwner } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";

/**
 * POST /api/dashboard/commissions/[id]/pay — PENDING -> PAID, stamps paidAt.
 * OWNER only, own salon only. The write is conditional on the row still being
 * PENDING, so a double click (or two tabs) can't pay twice or move paidAt.
 */

export const dynamic = "force-dynamic";

const ALREADY_PAID = { success: false, message: "This commission is already marked as paid." };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOwner(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const existing = await prisma.workerCommission.findFirst({ where: { id, salonId: auth.salonId }, select: { status: true } });
    if (!existing) return NextResponse.json({ success: false, message: "Commission record not found." }, { status: 404 });
    if (existing.status === "PAID") return NextResponse.json(ALREADY_PAID, { status: 409 });

    const { count } = await prisma.workerCommission.updateMany({
      where: { id, salonId: auth.salonId, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (count === 0) return NextResponse.json(ALREADY_PAID, { status: 409 });

    const row = await prisma.workerCommission.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({ success: true, commission: { id: row.id, status: row.status, paidAt: row.paidAt } });
  } catch (error) {
    return handleRouteError(error);
  }
}
