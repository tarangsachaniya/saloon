import "server-only";

import type { Prisma } from "@prisma/client";

import prisma from "./prisma";
import { parseDateOnly } from "./availability";

/**
 * Platform (Salonly) billing basis. A salon on a COMMISSION plan pays only on
 * bookings made ONLINE through the platform; walk-ins recorded by the salon's
 * owner or staff earn their worker commission but are never billable here.
 *
 * Single source of truth for statements: anything computing `completedBookings`
 * or `grossRevenue` for a BillingStatement must use this filter.
 */
export function platformBillableWhere(
  salonId: string,
  from?: string | null,
  to?: string | null,
): Prisma.AppointmentWhereInput {
  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = parseDateOnly(from);
  if (to) range.lte = parseDateOnly(to);
  return {
    salonId,
    source: "ONLINE",
    status: "COMPLETED",
    ...(from || to ? { appointmentDate: range } : {}),
  };
}

/** Completed online bookings and their gross (amount charged, else booked price). */
export async function platformBillableTotals(salonId: string, from?: string | null, to?: string | null) {
  const rows = await prisma.appointment.findMany({
    where: platformBillableWhere(salonId, from, to),
    select: { price: true, amountCharged: true },
  });
  const grossRevenue = rows.reduce((sum, r) => sum + Number(r.amountCharged ?? r.price), 0);
  return { completedBookings: rows.length, grossRevenue: Math.round(grossRevenue * 100) / 100 };
}
