import type { AppointmentStatus } from "@/lib/booking/types";

/**
 * The appointment status machine, mirrored from the backend.
 *
 * WHY A MIRROR: `isValidTransition` in `backend/controller/appointmentController.js`
 * rejects an illegal move with a 400. That is the authority and stays the
 * authority — this module exists so the admin UI never OFFERS a button the
 * server is going to refuse. Every rule below is a line-for-line copy of the
 * controller's, so the two cannot drift silently:
 *
 *   - `from === to` is a no-op and always "valid".
 *   - `COMPLETED` is terminal: no status change at all (notes remain editable).
 *   - `CANCELLED` / `NO_SHOW` are reachable from ANY live status.
 *   - From `CANCELLED` / `NO_SHOW` the only way back is `PENDING` or
 *     `CONFIRMED` — you can un-cancel, but not resurrect straight into
 *     `ARRIVED`.
 *   - Otherwise you may only move FORWARD along the linear chain (skipping
 *     ahead is allowed; going back is not).
 */

/** The linear lifecycle, in order. */
export const STATUS_CHAIN: readonly AppointmentStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

/** The two "did not happen" outcomes, reachable from any live status. */
export const TERMINAL_CANCELLATIONS: readonly AppointmentStatus[] = [
  "CANCELLED",
  "NO_SHOW",
] as const;

export function isValidTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  if (from === to) return true;
  if (from === "COMPLETED") return false;
  if (TERMINAL_CANCELLATIONS.includes(to)) return true;
  if (TERMINAL_CANCELLATIONS.includes(from)) {
    return to === "PENDING" || to === "CONFIRMED";
  }
  const fromIndex = STATUS_CHAIN.indexOf(from);
  const toIndex = STATUS_CHAIN.indexOf(to);
  return fromIndex !== -1 && toIndex > fromIndex;
}

/** Every status this appointment can legally move TO (excluding its own). */
export function allowedTransitions(
  from: AppointmentStatus,
): AppointmentStatus[] {
  return [...STATUS_CHAIN, ...TERMINAL_CANCELLATIONS].filter(
    (status) => status !== from && isValidTransition(from, status),
  );
}

/** True when the appointment's status is frozen (only notes can change). */
export function isTerminal(status: AppointmentStatus): boolean {
  return status === "COMPLETED";
}

export interface StatusAction {
  status: AppointmentStatus;
  /** Imperative label for a button ("Mark arrived"), not a state name. */
  label: string;
  /** How prominent the action should be in a row of buttons. */
  emphasis: "primary" | "secondary" | "danger";
}

/** Imperative labels — a button says what it DOES, not what the state is. */
const ACTION_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Reopen as pending",
  CONFIRMED: "Confirm",
  ARRIVED: "Mark arrived",
  IN_PROGRESS: "Start service",
  COMPLETED: "Mark completed",
  CANCELLED: "Cancel",
  NO_SHOW: "No show",
};

export function actionLabel(status: AppointmentStatus): string {
  return ACTION_LABELS[status] ?? status;
}

/**
 * The actions to show on an appointment row: the single natural NEXT step
 * along the chain, then the two "didn't happen" outcomes.
 *
 * Deliberately not every legal transition — PENDING → COMPLETED is legal but
 * offering it in a row of quick buttons invites a mis-tap that cannot be
 * undone. The full legal set is still available from the detail dialog.
 */
export function quickActions(from: AppointmentStatus): StatusAction[] {
  if (isTerminal(from)) return [];

  const actions: StatusAction[] = [];

  if (TERMINAL_CANCELLATIONS.includes(from)) {
    // Re-opening: CONFIRMED is what a front desk actually wants.
    actions.push({
      status: "CONFIRMED",
      label: "Reinstate",
      emphasis: "primary",
    });
    return actions;
  }

  const nextIndex = STATUS_CHAIN.indexOf(from) + 1;
  const next = STATUS_CHAIN[nextIndex];
  if (next) {
    actions.push({
      status: next,
      label: actionLabel(next),
      emphasis: "primary",
    });
  }

  actions.push(
    { status: "NO_SHOW", label: actionLabel("NO_SHOW"), emphasis: "secondary" },
    { status: "CANCELLED", label: actionLabel("CANCELLED"), emphasis: "danger" },
  );

  return actions;
}

/**
 * Statuses that still "count" — i.e. the booking is expected to happen or did.
 * Used for revenue and load metrics, which must not include cancellations or
 * no-shows (the chair was empty; the money never arrived).
 */
export function isRevenueBearing(status: AppointmentStatus): boolean {
  return status !== "CANCELLED" && status !== "NO_SHOW";
}
