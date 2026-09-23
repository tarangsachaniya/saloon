import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@/lib/booking/types";
import { optionalEmailSchema, phoneSchema } from "./booking";

/**
 * Admin form schemas. Kept to the fields the M4 brief pinned down — M6 can
 * extend these once the admin screens are designed.
 */

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * NOTE (M6): `phone` and `email` were required here in the M4 scaffold, but the
 * backend stores both as nullable and the seeded roster proves they are genuinely
 * optional. Requiring them would have forced an admin to invent a contact detail
 * to save a barber, so both are now "optional, but valid when supplied" —
 * matching `Barber.phone: string | null` / `Barber.email: string | null`.
 */
const imageSourceSchema = z.union([
  z.literal(""),
  z.url("Enter a valid image URL."),
  z.string().regex(/^\/[a-zA-Z0-9_\-./%]+$/, "Enter a valid URL or path starting with /."),
]);

export const barberFormSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80),
  phone: z.union([z.literal(""), phoneSchema]).optional(),
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]).optional(),
  photo: imageSourceSchema.optional(),
  bio: z.string().trim().max(600, "Bio is too long.").optional(),
  specializations: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
});
export type BarberFormInput = z.infer<typeof barberFormSchema>;

export const serviceFormSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80),
  description: z.string().trim().max(600, "Description is too long."),
  price: z
    .number({ error: "Enter a price." })
    .nonnegative("Price cannot be negative.")
    .max(100000, "Price looks too high."),
  durationMinutes: z
    .number({ error: "Enter a duration." })
    .int("Duration must be a whole number of minutes.")
    .min(5, "Duration must be at least 5 minutes.")
    .max(480, "Duration cannot exceed 8 hours."),
  category: z.union([z.literal(""), z.string().trim().max(60)]).optional(),
  isActive: z.boolean().default(true),
});
export type ServiceFormInput = z.infer<typeof serviceFormSchema>;

export const appointmentStatusSchema = z.enum(
  APPOINTMENT_STATUSES as unknown as [string, ...string[]],
);

/** Contact-details portion of salon settings. Hours are edited separately. */
export const salonProfileSchema = z.object({
  name: z.string().trim().min(1, "Salon name is required.").max(120),
  logo: imageSourceSchema.optional(),
  phone: phoneSchema,
  email: optionalEmailSchema,
  address: z.string().trim().max(240).optional(),
});
export type SalonProfileInput = z.infer<typeof salonProfileSchema>;

/** Booking-rule portion of salon settings. */
export const bookingRulesSchema = z.object({
  slotIntervalMinutes: z.number().int().min(5).max(120),
  minimumAdvanceBookingMinutes: z.number().int().min(0).max(10080),
  maximumAdvanceBookingDays: z.number().int().min(1).max(365),
  cancellationWindowMinutes: z.number().int().min(0).max(10080),
});
export type BookingRulesInput = z.infer<typeof bookingRulesSchema>;

/* -------------------------------------------------------------------------- */
/* Schedules (M6): barber working hours / breaks / days off, salon hours       */
/* -------------------------------------------------------------------------- */

/**
 * Minutes since midnight. `1440` (24:00) is allowed as an END time only, so a
 * row can legitimately close at midnight; start times are capped one minute
 * below it by the range refinements that use this.
 */
const minutesOfDay = z
  .number({ error: "Enter a time." })
  .int("Enter a valid time.")
  .min(0, "Enter a valid time.")
  .max(1440, "Enter a valid time.");

const weekday = z.number().int().min(0).max(6);

/** A start/end pair that must actually describe a forward interval. */
const timeRange = {
  startTime: minutesOfDay,
  endTime: minutesOfDay,
};
const endAfterStart = (value: { startTime: number; endTime: number }) =>
  value.endTime > value.startTime;
/**
 * NOTE (M6): `path` is deliberately NOT `as const`. Zod 4 types the refinement
 * params' `path` as a mutable `PropertyKey[]`, so a readonly tuple fails to
 * assign — which `tsc --noEmit` reported the moment these schemas gained their
 * first importer (the barber schedule editor).
 */
const END_AFTER_START = {
  message: "The end time must be after the start time.",
  path: ["endTime"],
};

/** One row of a barber's weekly schedule. Only validated when `isWorking`. */
export const workingHourRowSchema = z
  .object({ weekday, isWorking: z.boolean(), ...timeRange })
  .refine((row) => !row.isWorking || endAfterStart(row), END_AFTER_START);
export type WorkingHourRowInput = z.infer<typeof workingHourRowSchema>;

/** One recurring weekly break (lunch, school run, …). */
export const breakRowSchema = z
  .object({
    weekday,
    ...timeRange,
    label: z.string().trim().max(60, "Label is too long.").optional(),
  })
  .refine(endAfterStart, END_AFTER_START);
export type BreakRowInput = z.infer<typeof breakRowSchema>;

/** One one-off day off. */
export const dayOffRowSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  reason: z.string().trim().max(120, "Reason is too long.").optional(),
});
export type DayOffRowInput = z.infer<typeof dayOffRowSchema>;

/**
 * The whole schedule half of the barber form. Kept separate from
 * `barberFormSchema` so the two halves can report errors independently — a bad
 * break row should not blank out the name field's validation state.
 */
export const barberScheduleSchema = z.object({
  workingHours: z.array(workingHourRowSchema).length(7),
  breaks: z.array(breakRowSchema),
  daysOff: z.array(dayOffRowSchema),
});
export type BarberScheduleInput = z.infer<typeof barberScheduleSchema>;

/** One row of the salon's own opening hours. Same shape, different noun. */
export const openingHourRowSchema = z
  .object({ weekday, isOpen: z.boolean(), openTime: minutesOfDay, closeTime: minutesOfDay })
  .refine((row) => !row.isOpen || row.closeTime > row.openTime, {
    message: "Closing time must be after opening time.",
    path: ["closeTime"],
  });
export type OpeningHourRowInput = z.infer<typeof openingHourRowSchema>;

export const openingHoursSchema = z.array(openingHourRowSchema).length(7);
