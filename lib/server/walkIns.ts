import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";

import prisma from "./prisma";
import * as availability from "./availability";
import { APPOINTMENT_INCLUDE, serviceItemsCreate } from "./appointments";
import { upsertClientByPhone } from "./clients";
import { ensureCommissionForCompleted } from "./commissions";
import { isExclusionViolation, SLOT_TAKEN_MESSAGE } from "./dbErrors";

/**
 * Offline work recorded by the salon's owner or staff (customers never record
 * visits - they only pre-book online). Two modes:
 *
 *  - "sale": the work is done; record it now. COMPLETED at once, off the
 *    calendar (`blocksCalendar = false`), commission created in the same
 *    transaction at the rate the owner set.
 *  - "appointment": a walk-in put on the calendar like any booking (same slot
 *    grid and overlap constraint), completed later through the normal PATCH.
 *
 * Both are `source = WALK_IN`: they earn worker commission but are never
 * billable by the platform (see billing.ts).
 */

export type WalkInInput = {
  mode: "sale" | "appointment";
  barberId: string;
  serviceIds: string[];
  customerName?: string | null;
  customerPhone?: string | null;
  amountCharged?: number | null;
  date?: string;
  startTime?: string;
  notes?: string | null;
};

type Result =
  | { ok: true; appointment: Prisma.AppointmentGetPayload<{ include: typeof APPOINTMENT_INCLUDE }> }
  | { ok: false; status: number; message: string };

/** Who is recording: a worker with their own login may only record their own work. */
export type Recorder = { id: string; role: string; barberId: string | null };

export async function recordWalkIn(salonId: string, recorder: Recorder, input: WalkInInput): Promise<Result> {
  if (recorder.role === "STAFF" && recorder.barberId && recorder.barberId !== input.barberId) {
    return { ok: false, status: 403, message: "You can only record your own walk-ins." };
  }
  const recordedById = recorder.id;
  const serviceIds = availability.uniqueIds(input.serviceIds);
  const barber = await prisma.barber.findFirst({
    where: { id: input.barberId, salonId, isActive: true },
    select: { id: true },
  });
  if (!barber) return { ok: false, status: 404, message: "Worker not found." };

  let services: Awaited<ReturnType<typeof availability.loadServices>>;
  try {
    services = await availability.loadServices(salonId, serviceIds, true);
  } catch (error) {
    if (error instanceof availability.AvailabilityError) {
      return { ok: false, status: error.status, message: error.message };
    }
    throw error;
  }
  const bundle = availability.bundleServices(services);

  let date: string;
  let startTime: number;
  let endTime: number;
  if (input.mode === "appointment") {
    const resolved = await availability.resolveBooking({
      salonId,
      serviceIds,
      barberId: barber.id,
      date: input.date as string,
      startTime: input.startTime,
      staffBooking: true,
    });
    if (!resolved.ok) return { ok: false, status: resolved.status, message: resolved.message };
    date = input.date as string;
    startTime = resolved.startTime;
    endTime = resolved.endTime;
  } else {
    // A sale is recorded after the fact: default to "ended now" on the salon clock.
    const now = availability.salonNow();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    date = input.date ?? availability.toDateString(now);
    const requested = input.startTime ? availability.hhmmToMinutes(input.startTime) : null;
    if (input.startTime && requested === null) {
      return { ok: false, status: 400, message: "Invalid startTime. Expected format HH:MM." };
    }
    if (availability.daysBetween(availability.toDateString(now), date) > 0) {
      return { ok: false, status: 400, message: "A sale cannot be recorded for a future date." };
    }
    startTime = requested ?? Math.max(0, nowMinutes - bundle.durationMinutes);
    endTime = Math.min(startTime + bundle.durationMinutes, 1440);
  }

  const client =
    input.customerName && input.customerPhone
      ? await upsertClientByPhone({ salonId, name: input.customerName, phone: input.customerPhone })
      : null;

  const isSale = input.mode === "sale";
  try {
    const appointment = await prisma.$transaction(
      async (tx) => {
        const created = await tx.appointment.create({
          data: {
            salonId,
            clientId: client?.id ?? null,
            barberId: barber.id,
            serviceId: bundle.id,
            services: serviceItemsCreate(services),
            appointmentDate: availability.parseDateOnly(date),
            startTime,
            endTime,
            durationMinutes: bundle.durationMinutes,
            price: bundle.price,
            amountCharged: input.amountCharged ?? null,
            status: isSale ? "COMPLETED" : "CONFIRMED",
            source: "WALK_IN",
            blocksCalendar: !isSale,
            recordedById,
            notes: input.notes || null,
            reviewToken: isSale ? randomBytes(18).toString("base64url") : null,
          },
          include: APPOINTMENT_INCLUDE,
        });
        if (isSale) await ensureCommissionForCompleted(tx, created.id);
        if (client) {
          await tx.client.update({
            where: { id: client.id },
            data: {
              totalVisits: { increment: 1 },
              ...(isSale ? { lastVisit: created.appointmentDate } : {}),
            },
          });
        }
        return created;
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
    return { ok: true, appointment };
  } catch (error) {
    if (isExclusionViolation(error)) return { ok: false, status: 409, message: SLOT_TAKEN_MESSAGE };
    throw error;
  }
}
