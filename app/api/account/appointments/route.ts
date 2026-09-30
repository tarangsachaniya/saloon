import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireCustomer } from "@/lib/server/account";
import { handleRouteError } from "@/lib/server/http";
import { salonNow } from "@/lib/server/availability";
import { MY_APPOINTMENT_INCLUDE, serializeMyAppointment } from "@/lib/server/customerAppointments";

/**
 * GET /api/account/appointments — the signed-in customer's own appointments.
 * The filter is `userId = token's user`; nothing in the URL can widen it.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireCustomer(request);
    if ("error" in auth) return auth.error;

    const rows = await prisma.appointment.findMany({
      where: { userId: auth.user.id },
      include: MY_APPOINTMENT_INCLUDE,
      orderBy: [{ appointmentDate: "asc" }, { startTime: "asc" }],
    });
    const now = salonNow();
    return NextResponse.json({ success: true, appointments: rows.map((r) => serializeMyAppointment(r, now)) });
  } catch (error) {
    return handleRouteError(error);
  }
}
