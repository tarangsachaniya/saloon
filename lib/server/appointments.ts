import "server-only";

import type { Prisma } from "@prisma/client";

/**
 * Shared appointment rules, lifted out of
 * `backend/controller/appointmentController.js` so the create and update Route
 * Handlers agree on them.
 */

/** Relations every appointment response carries (`services` in booking order). */
export const APPOINTMENT_INCLUDE = {
  client: true,
  barber: true,
  service: true,
  services: { orderBy: { sortOrder: "asc" } },
} as const;

/**
 * Nested-create rows for an appointment's services: name/price/duration are
 * snapshotted so later catalogue edits never rewrite a booking.
 */
export function serviceItemsCreate(
  services: { id: string; name: string; price: Prisma.Decimal; durationMinutes: number }[],
) {
  return {
    create: services.map((s, sortOrder) => ({
      serviceId: s.id,
      name: s.name,
      price: s.price,
      durationMinutes: s.durationMinutes,
      sortOrder,
    })),
  };
}

const STATUS_CHAIN = ["PENDING", "CONFIRMED", "ARRIVED", "IN_PROGRESS", "COMPLETED"];
const TERMINAL_CANCELLATIONS = ["CANCELLED", "NO_SHOW"];

/**
 * Verbatim port of `isValidTransition`.
 *
 * - staying put is always fine,
 * - COMPLETED is terminal,
 * - cancel / no-show are reachable from any live state,
 * - re-opening a cancelled booking is allowed back to PENDING/CONFIRMED (the
 *   exclusion constraint has the final say on whether the slot is still free),
 * - otherwise you may only move FORWARD along the lifecycle chain.
 */
export function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true;
  if (from === "COMPLETED") return false;
  if (TERMINAL_CANCELLATIONS.includes(to)) return true;
  if (TERMINAL_CANCELLATIONS.includes(from)) return to === "PENDING" || to === "CONFIRMED";
  const fromIndex = STATUS_CHAIN.indexOf(from);
  const toIndex = STATUS_CHAIN.indexOf(to);
  return fromIndex !== -1 && toIndex > fromIndex;
}
