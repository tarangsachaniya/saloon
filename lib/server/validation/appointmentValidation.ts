import "server-only";

import { z, idString, dateString, timeString, appointmentStatus } from "./common";

// Port of `backend/model/validation/appointmentValidation.js`, unwrapped from
// the Express `{body, query, params}` envelope.

// Public booking request. `barberId` accepts the literal "any" - the server
// resolves it to a concrete barber, never the client.
export const createAppointmentBodySchema = z.object({
  serviceId: idString,
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
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });

export const listAppointmentsQuerySchema = z.object({
  date: dateString.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  barberId: idString.optional(),
  status: appointmentStatus.optional(),
});
