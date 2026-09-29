import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/server/prisma";
import * as availability from "@/lib/server/availability";
import { requireAdmin } from "@/lib/server/auth";
import { APPOINTMENT_INCLUDE } from "@/lib/server/appointments";
import { handleRouteError } from "@/lib/server/http";

/**
 * GET /api/dashboard/appointments?date=&from=&to=&barberId=&status=
 * Port of `appointmentController.listAppointments`.
 *
 * `from`/`to` give an inclusive date range and are ignored whenever `date` is
 * supplied, exactly as before.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;
    const { salonId } = auth;

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const barberId = searchParams.get("barberId");
    const status = searchParams.get("status");

    const where: Prisma.AppointmentWhereInput = { salonId };
    if (date) {
      if (!availability.isValidDateString(date)) {
        return NextResponse.json(
          { success: false, message: "Invalid date. Expected format YYYY-MM-DD." },
          { status: 400 },
        );
      }
      where.appointmentDate = availability.parseDateOnly(date);
    } else if (from || to) {
      const range: Prisma.DateTimeFilter = {};
      if (from) range.gte = availability.parseDateOnly(from);
      if (to) range.lte = availability.parseDateOnly(to);
      where.appointmentDate = range;
    }
    if (barberId) where.barberId = barberId; // salonId already pins the tenant
    if (status) where.status = status as Prisma.AppointmentWhereInput["status"];

    const appointments = await prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
      orderBy: [{ appointmentDate: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ success: true, appointments }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
