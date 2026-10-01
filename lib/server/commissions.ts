import "server-only";

import { Prisma } from "@prisma/client";

/**
 * Worker commission (percentage of each COMPLETED service).
 *
 * Rules, all enforced here or in the owner-only routes:
 *  - generated only when an appointment becomes COMPLETED (never at booking,
 *    never for CANCELLED / NO_SHOW);
 *  - percentage and amounts are SNAPSHOTS on the row, so changing a worker's
 *    percentage or a service price later never rewrites history;
 *  - at most one row per appointment (`appointmentId` is UNIQUE and the insert
 *    is ON CONFLICT DO NOTHING, so re-processing is a harmless no-op);
 *  - the amount comes from the appointment's own stored `price`, never the client.
 */

export const MIN_PERCENT = 0;
export const MAX_PERCENT = 100;

/** A percentage the API will accept: a real number in [0, 100] with at most 2 decimals. */
export function isValidPercentage(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_PERCENT &&
    value <= MAX_PERCENT &&
    Math.abs(Math.round(value * 100) - value * 100) < 1e-6
  );
}

/** amount x percentage / 100, rounded half-up to 2 decimals (exact decimal maths, no floats). */
export function calcCommission(amount: Prisma.Decimal.Value, percentage: Prisma.Decimal.Value): Prisma.Decimal {
  return new Prisma.Decimal(amount).mul(percentage).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

type Tx = Prisma.TransactionClient;

/**
 * Create the commission row for a COMPLETED appointment, inside the caller's
 * transaction (so "COMPLETED without commission" cannot be committed).
 * Idempotent. Returns the row, or null when the appointment is not commissionable.
 */
export async function ensureCommissionForCompleted(tx: Tx, appointmentId: string) {
  try {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, salonId: true, barberId: true, price: true, status: true },
    });
    if (!appointment || appointment.status !== "COMPLETED") return null;

    const barber = await tx.barber.findFirst({
      where: { id: appointment.barberId, salonId: appointment.salonId },
      // An explicit `select` opts back in past the client-wide omit.
      select: { id: true, commissionPercentage: true },
    });
    if (!barber) throw new Error(`commission: barber ${appointment.barberId} not in salon ${appointment.salonId}`);

    await tx.workerCommission.createMany({
      data: [
        {
          appointmentId: appointment.id,
          barberId: barber.id,
          salonId: appointment.salonId,
          commissionPercentage: barber.commissionPercentage,
          serviceAmount: appointment.price,
          commissionAmount: calcCommission(appointment.price, barber.commissionPercentage),
        },
      ],
      skipDuplicates: true,
    });
    return await tx.workerCommission.findUnique({ where: { appointmentId: appointment.id } });
  } catch (error) {
    // Never swallowed: the caller's transaction rolls back and the request
    // fails with the generic 500 (no DB detail reaches the client).
    console.error("[commission] failed to create commission for appointment", appointmentId, error);
    throw error;
  }
}

/** Optional inclusive "YYYY-MM-DD" range on the APPOINTMENT date. */
export function appointmentDateFilter(from: string | null, to: string | null): Prisma.WorkerCommissionWhereInput {
  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.lte = new Date(`${to}T00:00:00.000Z`);
  return from || to ? { appointment: { appointmentDate: range } } : {};
}
