import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/server/prisma";
import * as availability from "@/lib/server/availability";
import { requireAdmin } from "@/lib/server/auth";
import { APPOINTMENT_INCLUDE } from "@/lib/server/appointments";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { createWalkInBodySchema } from "@/lib/server/validation/appointmentValidation";
import { recordWalkIn, type WalkInInput } from "@/lib/server/walkIns";

/**
 * GET /api/dashboard/appointments?date=&from=&to=&barberId=&status=&source=
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
    const source = searchParams.get("source");
    if (source === "ONLINE" || source === "WALK_IN") where.source = source;

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

/**
 * POST /api/dashboard/appointments - owner or staff record offline work
 * (a walk-in): `mode: "sale"` for work already done, `mode: "appointment"` to
 * put a walk-in on the calendar. Body: see `createWalkInBodySchema`.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<WalkInInput>(request, createWalkInBodySchema);
    if ("error" in parsed) return parsed.error;

    const result = await recordWalkIn(auth.salonId, auth.user, parsed.body);
    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }
    return NextResponse.json({ success: true, appointment: result.appointment }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
