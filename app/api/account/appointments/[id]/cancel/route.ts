import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireCustomer } from "@/lib/server/account";
import { handleRouteError } from "@/lib/server/http";
import { salonNow } from "@/lib/server/availability";
import { LIVE_STATUSES, changeDecision } from "@/lib/server/appointmentPolicy";
import { MY_APPOINTMENT_INCLUDE, serializeMyAppointment } from "@/lib/server/customerAppointments";

/**
 * POST /api/account/appointments/[id]/cancel
 *
 * Sets status CANCELLED (never deletes). Ownership is part of the lookup
 * (`id` AND `userId`), so someone else's appointment is indistinguishable from
 * a missing one (404). The write is a conditional update on the still-live
 * status, so two simultaneous cancels (or a cancel racing a salon-side change)
 * can't both succeed. Cancelling frees the slot: the overlap constraint
 * ignores CANCELLED rows.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCustomer(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: { id, userId: auth.user.id },
      include: MY_APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      return NextResponse.json({ success: false, message: "Appointment not found." }, { status: 404 });
    }

    const now = salonNow();
    const decision = changeDecision(appointment, now, appointment.salon.settings?.cancellationWindowMinutes ?? 60, "cancel");
    if (!decision.allowed) {
      return NextResponse.json({ success: false, message: decision.reason }, { status: 409 });
    }

    const { count } = await prisma.appointment.updateMany({
      where: { id, userId: auth.user.id, status: { in: [...LIVE_STATUSES] } },
      data: { status: "CANCELLED" },
    });
    if (count === 0) {
      return NextResponse.json(
        { success: false, message: "This appointment can no longer be cancelled." },
        { status: 409 },
      );
    }

    const updated = await prisma.appointment.findUniqueOrThrow({ where: { id }, include: MY_APPOINTMENT_INCLUDE });
    return NextResponse.json({ success: true, appointment: serializeMyAppointment(updated, now) });
  } catch (error) {
    return handleRouteError(error);
  }
}
