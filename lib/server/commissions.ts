import "server-only";

import { Prisma } from "@prisma/client";

/**
 * Worker commission on each COMPLETED appointment, online or walk-in. The owner
 * sets, per worker, either a PERCENT of the amount charged or a FLAT amount per
 * service performed.
 *
 * Rules, all enforced here or in the owner-only routes:
 *  - generated only when an appointment becomes COMPLETED (never at booking,
 *    never for CANCELLED / NO_SHOW);
 *  - percentage and amounts are SNAPSHOTS on the row, so changing a worker's
 *    percentage or a service price later never rewrites history;
 *  - at most one row per appointment (`appointmentId` is UNIQUE and the insert
 *    is ON CONFLICT DO NOTHING, so re-processing is a harmless no-op);
 *  - the amount is the appointment's `amountCharged` (entered by owner/staff)
 *    or else its stored `price` - never a value sent by the customer.
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

/** A flat amount the API will accept: >= 0, at most 2 decimals, below a sane cap. */
export function isValidFlatAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1_000_000 &&
    Math.abs(Math.round(value * 100) - value * 100) < 1e-6
  );
}

/** PERCENT: amount x pct / 100. FLAT: flat x number of services performed. */
export function calcWorkerCommission({
  type,
  percentage,
  flatAmount,
  amount,
  serviceCount,
}: {
  type: "PERCENT" | "FLAT";
  percentage: Prisma.Decimal.Value;
  flatAmount: Prisma.Decimal.Value;
  amount: Prisma.Decimal.Value;
  serviceCount: number;
}): Prisma.Decimal {
  if (type === "FLAT") {
    return new Prisma.Decimal(flatAmount).mul(serviceCount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }
  return calcCommission(amount, percentage);
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
      select: {
        id: true,
        salonId: true,
        barberId: true,
        price: true,
        amountCharged: true,
        status: true,
        source: true,
        _count: { select: { services: true } },
      },
    });
    if (!appointment || appointment.status !== "COMPLETED") return null;

    const barber = await tx.barber.findFirst({
      where: { id: appointment.barberId, salonId: appointment.salonId },
      // An explicit `select` opts back in past the client-wide omit.
      select: { id: true, commissionPercentage: true, commissionType: true, commissionFlatAmount: true },
    });
    if (!barber) throw new Error(`commission: barber ${appointment.barberId} not in salon ${appointment.salonId}`);

    const amount = appointment.amountCharged ?? appointment.price;
    // Rows predating multi-service have no items: that was one service.
    const serviceCount = Math.max(appointment._count.services, 1);
    await tx.workerCommission.createMany({
      data: [
        {
          appointmentId: appointment.id,
          barberId: barber.id,
          salonId: appointment.salonId,
          source: appointment.source,
          commissionType: barber.commissionType,
          commissionPercentage: barber.commissionPercentage,
          flatAmount: barber.commissionFlatAmount,
          serviceCount,
          serviceAmount: amount,
          commissionAmount: calcWorkerCommission({
            type: barber.commissionType,
            percentage: barber.commissionPercentage,
            flatAmount: barber.commissionFlatAmount,
            amount,
            serviceCount,
          }),
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
