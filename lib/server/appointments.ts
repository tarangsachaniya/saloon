import "server-only";

/**
 * Shared appointment rules, lifted out of
 * `backend/controller/appointmentController.js` so the create and update Route
 * Handlers agree on them.
 */

/** Relations every appointment response carries. */
export const APPOINTMENT_INCLUDE = { client: true, barber: true, service: true } as const;

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
