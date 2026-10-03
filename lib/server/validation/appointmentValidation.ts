import "server-only";

import { z, idString, dateString, timeString, appointmentStatus } from "./common";

// Port of `backend/model/validation/appointmentValidation.js`, unwrapped from
// the Express `{body, query, params}` envelope.

// One or more services done back-to-back by one barber. Older app builds send a
// single `serviceId`; routes fold it in with `requestedServiceIds`
// (parseJsonBody returns the RAW body, so a Zod transform would not apply).
const serviceIdList = z.array(idString).min(1).max(10);

/** `serviceIds` (de-duplicated, in order) or the legacy single `serviceId`. */
export function requestedServiceIds(body: { serviceId?: string; serviceIds?: string[] }): string[] {
  return [...new Set(body.serviceIds?.length ? body.serviceIds : body.serviceId ? [body.serviceId] : [])];
}

const hasServices = (d: { serviceId?: string; serviceIds?: string[] }) =>
  Boolean(d.serviceIds?.length || d.serviceId);

// Public booking request. `barberId` accepts the literal "any" - the server
// resolves it to a concrete barber, never the client.
export const createAppointmentBodySchema = z
  .object({
    serviceIds: serviceIdList.optional(),
    serviceId: idString.optional(),
    barberId: idString.default("any"),
    date: dateString,
    startTime: timeString,
    customerName: z.string().trim().min(1).max(120),
    customerPhone: z.string().trim().min(5).max(20),
    customerEmail: z.email().max(180).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    // Data-processing consent is mandatory to book; marketing is a separate opt-in.
    consent: z.literal(true),
    marketingOptIn: z.boolean().optional(),
  })
  .refine(hasServices, { message: "Choose at least one service", path: ["serviceIds"] });

// Owner/staff recording offline work. "sale" = already done, recorded now
// (COMPLETED, off the calendar); "appointment" = a walk-in put on the calendar.
export const createWalkInBodySchema = z
  .object({
    mode: z.enum(["sale", "appointment"]),
    barberId: idString,
    serviceIds: serviceIdList,
    // Optional customer: an anonymous walk-in needs none.
    customerName: z.string().trim().min(1).max(120).optional().nullable(),
    customerPhone: z.string().trim().min(5).max(20).optional().nullable(),
    // What the customer paid; defaults to the sum of the service prices.
    amountCharged: z.number().min(0).max(10_000_000).optional().nullable(),
    // "appointment" mode: the calendar slot. "sale" mode: optional, defaults to now.
    date: dateString.optional(),
    startTime: timeString.optional(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine((d) => !d.customerPhone || d.customerName, {
    message: "Customer name is required with a phone number",
    path: ["customerName"],
  })
  .refine((d) => d.mode === "sale" || (d.date && d.startTime), {
    message: "date and startTime are required to book a walk-in on the calendar",
    path: ["startTime"],
  });

// Admin PATCH: status transition and/or reschedule. At least one field.
export const updateAppointmentBodySchema = z
  .object({
    status: appointmentStatus.optional(),
    barberId: idString.optional(),
    serviceId: idString.optional(),
    date: dateString.optional(),
    startTime: timeString.optional(),
    notes: z.string().max(1000).optional().nullable(),
    // Owner/staff entering what was actually charged (commission is based on it).
    amountCharged: z.number().min(0).max(10_000_000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });

export const listAppointmentsQuerySchema = z.object({
  date: dateString.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  barberId: idString.optional(),
  status: appointmentStatus.optional(),
});
