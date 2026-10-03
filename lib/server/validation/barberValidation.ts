import "server-only";

import { z, idString, dateString, minuteOfDay, weekday } from "./common";

// Port of `backend/model/validation/barberValidation.js`.

const workingHour = z
  .object({
    weekday,
    isWorking: z.boolean().optional(),
    startTime: minuteOfDay,
    endTime: minuteOfDay,
  })
  .refine((v) => v.isWorking === false || v.startTime < v.endTime, {
    message: "startTime must be before endTime",
  });

const breakEntry = z
  .object({
    weekday,
    startTime: minuteOfDay,
    endTime: minuteOfDay,
    label: z.string().max(60).optional().nullable(),
  })
  .refine((v) => v.startTime < v.endTime, { message: "startTime must be before endTime" });

const dayOff = z.object({
  date: dateString,
  reason: z.string().max(200).optional().nullable(),
});

const barberFields = {
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.email().max(180).optional().nullable(),
  photo: z.string().max(500).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  specializations: z.array(z.string().max(80)).optional(),
  isActive: z.boolean().optional(),
  // Off = customers cannot pre-book this worker online (walk-ins only).
  onlineBookingEnabled: z.boolean().optional(),
  serviceIds: z.array(idString).optional(),
  workingHours: z.array(workingHour).optional(),
  breaks: z.array(breakEntry).optional(),
  daysOff: z.array(dayOff).optional(),
};

export const createBarberBodySchema = z.object(barberFields);

export const updateBarberBodySchema = z.object({
  ...barberFields,
  name: barberFields.name.optional(),
});

/**
 * Defined in the Express codebase but never wired into a route (the
 * availability handler does its own `serviceId`/`date` presence check), so it
 * is ported for parity and likewise left unwired.
 */
export const barberAvailabilityQuerySchema = z.object({
  serviceId: idString,
  date: dateString,
});
