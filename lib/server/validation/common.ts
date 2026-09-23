import "server-only";

import { z } from "zod";

/**
 * Port of `backend/model/validation/common.js`.
 *
 * The Express schemas were wrapped in `{ body, query, params }` because
 * `zodMiddleware.js` parsed the whole request object at once. Route Handlers
 * get those three separately, so the ported schemas validate each piece on its
 * own — same rules, one level less nesting.
 */

export const idString = z.string().min(1, { message: "id is required" });

/** Plain calendar date, never a timestamp: "YYYY-MM-DD". */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Expected date as YYYY-MM-DD" });

/** Wall-clock time on the salon's grid: "HH:MM". */
export const timeString = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, { message: "Expected time as HH:MM" });

/** Minutes since midnight (1440 allowed as an exclusive end-of-day bound). */
export const minuteOfDay = z.number().int().min(0).max(1440);

export const weekday = z.number().int().min(0).max(6);

export const booleanish = z.union([z.boolean(), z.enum(["true", "false"])]);

export const appointmentStatus = z.enum([
  "PENDING",
  "CONFIRMED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const idParams = z.object({ id: idString });

export { z };
