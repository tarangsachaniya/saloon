import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

import prisma from "@/lib/server/prisma";
import * as availability from "@/lib/server/availability";
import { requireAdmin } from "@/lib/server/auth";
import { APPOINTMENT_INCLUDE, isValidTransition } from "@/lib/server/appointments";
import { isExclusionViolation, SLOT_TAKEN_MESSAGE } from "@/lib/server/dbErrors";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { updateAppointmentBodySchema } from "@/lib/server/validation/appointmentValidation";

/**
 * GET   /api/dashboard/appointments/:id — port of `appointmentController.getAppointment`
 * PATCH /api/dashboard/appointments/:id — port of `appointmentController.updateAppointment`
 *
 * The PATCH handles both status transitions and reschedules (barber / date /
 * time / service), re-running the FULL availability re-check for the latter —
 * the same code path a customer booking goes through, with the appointment's
 * own row excluded from the overlap check.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;
    const { salonId } = auth;

    const { id } = await params;
    const appointment = await prisma.appointment.findFirst({
      where: { id, salonId },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      return NextResponse.json(
        { success: false, message: "Appointment not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, appointment }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;
    const { salonId } = auth;

    const { id } = await params;
    const parsed = await parseJsonBody<{
      status?: string;
      notes?: string | null;
      barberId?: string;
      serviceId?: string;
      date?: string;
      startTime?: string;
    }>(request, updateAppointmentBodySchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

    const existing = await prisma.appointment.findFirst({ where: { id, salonId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Appointment not found." },
        { status: 404 },
      );
    }

    const data: Prisma.AppointmentUncheckedUpdateInput = {};

    if (body.notes !== undefined) data.notes = body.notes || null;

    if (body.status !== undefined && body.status !== existing.status) {
      if (!isValidTransition(existing.status, body.status)) {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot change status from ${existing.status} to ${body.status}.`,
          },
          { status: 400 },
        );
      }
      data.status = body.status as Prisma.AppointmentUncheckedUpdateInput["status"];
      // A finished visit unlocks the customer's one-time review link.
      if (body.status === "COMPLETED" && !existing.reviewToken) {
        data.reviewToken = randomBytes(18).toString("base64url");
      }
    }

    // --- reschedule ---------------------------------------------------
    const currentDate = availability.utcDateString(existing.appointmentDate);
    const targetServiceId = body.serviceId || existing.serviceId;
    const targetBarberId = body.barberId || existing.barberId;
    const targetDate = body.date || currentDate;
    const targetStart =
      body.startTime !== undefined
        ? availability.hhmmToMinutes(body.startTime)
        : existing.startTime;

    const isReschedule =
      targetServiceId !== existing.serviceId ||
      targetBarberId !== existing.barberId ||
      targetDate !== currentDate ||
      targetStart !== existing.startTime;

    if (isReschedule) {
      if (targetStart === null) {
        return NextResponse.json(
          { success: false, message: "Invalid startTime. Expected format HH:MM." },
          { status: 400 },
        );
      }
      const resolved = await availability.resolveBooking({
        salonId,
        serviceId: targetServiceId,
        barberId: targetBarberId,
        date: targetDate,
        startTime: availability.minutesToHHMM(targetStart),
        excludeAppointmentId: existing.id,
      });
      if (!resolved.ok) {
        return NextResponse.json(
          { success: false, message: resolved.message },
          { status: resolved.status },
        );
      }

      data.serviceId = resolved.service.id;
      data.barberId = resolved.barberId;
      data.appointmentDate = availability.parseDateOnly(targetDate);
      data.startTime = resolved.startTime;
      data.endTime = resolved.endTime;
      data.durationMinutes = resolved.service.durationMinutes;
      data.price = resolved.service.price;
    }

    if (Object.keys(data).length === 0) {
      const unchanged = await prisma.appointment.findUnique({
        where: { id: existing.id },
        include: APPOINTMENT_INCLUDE,
      });
      return NextResponse.json({ success: true, appointment: unchanged }, { status: 200 });
    }

    let appointment;
    try {
      appointment = await prisma.appointment.update({
        where: { id: existing.id },
        data,
        include: APPOINTMENT_INCLUDE,
      });
    } catch (error) {
      if (isExclusionViolation(error)) {
        return NextResponse.json(
          { success: false, message: SLOT_TAKEN_MESSAGE },
          { status: 409 },
        );
      }
      throw error;
    }

    if (data.status === "COMPLETED") {
      await prisma.client.update({
        where: { id: appointment.clientId },
        data: { lastVisit: appointment.appointmentDate },
      });
    }

    return NextResponse.json({ success: true, appointment }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
