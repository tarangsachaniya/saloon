import { NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/server/prisma";
import { requireCustomer } from "@/lib/server/account";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { hhmmToMinutes, parseDateOnly, resolveBooking, salonNow } from "@/lib/server/availability";
import { LIVE_STATUSES, changeDecision } from "@/lib/server/appointmentPolicy";
import {
  MY_APPOINTMENT_INCLUDE,
  bookedServiceIds,
  servicesActive,
  UNAVAILABLE_FOR_RESCHEDULE,
  serializeMyAppointment,
} from "@/lib/server/customerAppointments";
import { isExclusionViolation, SLOT_TAKEN_MESSAGE } from "@/lib/server/dbErrors";

/**
 * POST /api/account/appointments/[id]/reschedule { date, startTime }
 *
 * Moves the EXISTING appointment: only appointmentDate/startTime/endTime
 * change. Client, salon, service, barber, price and duration stay as booked.
 * The new time is validated by the same engine as a fresh booking
 * (`resolveBooking`: opening hours, working hours, breaks, days off, other
 * appointments, duration, interval, booking window), with this appointment
 * excluded so it doesn't block its own neighbours, and the database exclusion
 * constraint has the final word on a concurrent race.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/, "Choose a time."),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCustomer(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const parsed = await parseJsonStrict(request, bodySchema);
    if ("error" in parsed) return parsed.error;
    const { date, startTime } = parsed.data;

    const appointment = await prisma.appointment.findFirst({
      where: { id, userId: auth.user.id },
      include: MY_APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      return NextResponse.json({ success: false, message: "Appointment not found." }, { status: 404 });
    }

    const now = salonNow();
    const decision = changeDecision(appointment, now, appointment.salon.settings?.cancellationWindowMinutes ?? 60, "reschedule");
    if (!decision.allowed) {
      return NextResponse.json({ success: false, message: decision.reason }, { status: 409 });
    }
    if (!appointment.salon.isActive || !servicesActive(appointment) || !appointment.barber.isActive) {
      return NextResponse.json({ success: false, message: UNAVAILABLE_FOR_RESCHEDULE }, { status: 409 });
    }

    const newStart = hhmmToMinutes(startTime);
    if (date === appointment.appointmentDate.toISOString().slice(0, 10) && newStart === appointment.startTime) {
      return NextResponse.json(
        { success: false, message: "That's your current time. Please choose a different one." },
        { status: 400 },
      );
    }

    // Same rules as a new booking, for THIS barber and these services.
    const resolved = await resolveBooking({
      salonId: appointment.salonId,
      serviceIds: bookedServiceIds(appointment),
      barberId: appointment.barberId,
      date,
      startTime,
      excludeAppointmentId: appointment.id,
      bookableOnly: true,
    });
    if (!resolved.ok) {
      return NextResponse.json({ success: false, message: resolved.message }, { status: resolved.status });
    }
    // The appointment keeps the (total) duration it was booked with; if a service
    // has since been edited the two would disagree, so don't guess.
    if (resolved.service.durationMinutes !== appointment.durationMinutes) {
      return NextResponse.json(
        { success: false, message: "This service has changed since you booked. Please cancel and book again." },
        { status: 409 },
      );
    }

    try {
      const { count } = await prisma.appointment.updateMany({
        where: { id, userId: auth.user.id, status: { in: [...LIVE_STATUSES] } },
        data: {
          appointmentDate: parseDateOnly(date),
          startTime: resolved.startTime,
          endTime: resolved.endTime,
        },
      });
      if (count === 0) {
        return NextResponse.json(
          { success: false, message: "This appointment can no longer be rescheduled." },
          { status: 409 },
        );
      }
    } catch (error) {
      if (isExclusionViolation(error)) {
        return NextResponse.json({ success: false, message: SLOT_TAKEN_MESSAGE }, { status: 409 });
      }
      throw error;
    }

    const updated = await prisma.appointment.findUniqueOrThrow({ where: { id }, include: MY_APPOINTMENT_INCLUDE });
    return NextResponse.json({ success: true, appointment: serializeMyAppointment(updated, now) });
  } catch (error) {
    return handleRouteError(error);
  }
}
