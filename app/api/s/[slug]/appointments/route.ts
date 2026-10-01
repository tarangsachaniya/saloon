import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import * as availability from "@/lib/server/availability";
import { isExclusionViolation, SLOT_TAKEN_MESSAGE } from "@/lib/server/dbErrors";
import { upsertClientByPhone } from "@/lib/server/clients";
import { APPOINTMENT_INCLUDE } from "@/lib/server/appointments";
import { sendAppointmentBookedMail } from "@/lib/server/mail";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { resolveSalon } from "@/lib/server/salon";
import { getOptionalCustomer } from "@/lib/server/auth";
import { CONSENT_VERSION } from "@/lib/legal/versions";
import { createAppointmentBodySchema } from "@/lib/server/validation/appointmentValidation";

/**
 * POST /api/s/[slug]/appointments — the public customer booking endpoint.
 * Port of `appointmentController.createAppointment`.
 *
 * Nothing about a booking is taken on trust from the client. The requested
 * start is re-derived from the server's own slot grid, "any barber" is
 * re-resolved server-side, and the final word belongs to the Postgres
 * exclusion constraint on (barberId, slotRange) — see `lib/server/dbErrors.ts`.
 *
 * (No Socket.IO emit: the admin dashboard was built without it, on manual
 * refresh plus optimistic row updates.)
 */

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const gate = await resolveSalon(params);
    if ("error" in gate) return gate.error;
    const salon = gate.salon;

    // Booking needs an account: the appointment belongs to the signed-in customer
    // (taken from the token, never the body), and My Appointments depends on it.
    const customer = await getOptionalCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Please sign in to your customer account to book." },
        { status: 401 },
      );
    }

    const parsed = await parseJsonBody<{
      serviceId: string;
      barberId?: string;
      date: string;
      startTime: string;
      customerName: string;
      customerPhone: string;
      customerEmail?: string | null;
      notes?: string | null;
      consent: true;
      marketingOptIn?: boolean;
    }>(request, createAppointmentBodySchema);
    if ("error" in parsed) return parsed.error;

    const {
      serviceId,
      barberId = "any",
      date,
      startTime,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      marketingOptIn,
    } = parsed.body;

    // (a)+(b) Re-derive the grid and resolve "any" server-side.
    const resolved = await availability.resolveBooking({
      salonId: salon.id,
      serviceId,
      barberId,
      date,
      startTime,
      bookableOnly: true,
    });
    if (!resolved.ok) {
      return NextResponse.json(
        { success: false, message: resolved.message },
        { status: resolved.status },
      );
    }

    // (c) One client row per phone number.
    const client = await upsertClientByPhone({
      salonId: salon.id,
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
    });

    // (d)+(e) Authoritative write - a concurrent overlapping booking loses here.
    let appointment;
    try {
      appointment = await prisma.appointment.create({
        data: {
          salonId: salon.id,
          clientId: client.id,
          userId: customer.id,
          barberId: resolved.barberId,
          serviceId: resolved.service.id,
          appointmentDate: availability.parseDateOnly(date),
          startTime: resolved.startTime,
          endTime: resolved.endTime,
          durationMinutes: resolved.service.durationMinutes,
          price: resolved.service.price,
          status: "CONFIRMED",
          notes: notes || null,
          consentAt: new Date(),
          consentVersion: CONSENT_VERSION,
          marketingOptIn: Boolean(marketingOptIn),
        },
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

    // (f) CRM counters.
    await prisma.client.update({
      where: { id: client.id },
      data: { totalVisits: { increment: 1 }, lastVisit: appointment.appointmentDate },
    });

    // Confirmation email is best-effort - it must never fail a booking.
    sendAppointmentBookedMail(appointment).catch((error: unknown) =>
      console.error(
        "[mail] appointment confirmation failed:",
        error instanceof Error ? error.message : error,
      ),
    );

    // (h)
    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
