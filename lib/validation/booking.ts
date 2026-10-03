import { z } from "zod";

/**
 * Client-side validation for the customer booking wizard.
 * Mirrors the `POST /api/appointments` request body. The server re-validates —
 * these schemas exist for fast inline feedback, not as a security boundary.
 */

/**
 * Permissive international phone check: allows +, spaces, hyphens, dots and
 * parentheses, but requires 7–15 actual digits (ITU E.164 range). Deliberately
 * loose — over-strict phone regexes reject real numbers and cost bookings.
 */
const PHONE_CHARS = /^[+]?[0-9\s\-().]+$/;

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .refine((value) => PHONE_CHARS.test(value), {
    message: "Phone number contains invalid characters.",
  })
  .refine(
    (value) => {
      const digits = value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    },
    { message: "Enter a valid phone number." },
  );

/** Email is optional, but must be a real address when provided. */
export const optionalEmailSchema = z
  .union([z.literal(""), z.email("Enter a valid email address.")])
  .optional();

export const customerNameSchema = z
  .string()
  .trim()
  .min(2, "Please enter your full name.")
  .max(80, "Name is too long.");

/** The "your details" step of the wizard. */
export const customerDetailsSchema = z.object({
  name: customerNameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  notes: z.string().trim().max(500, "Notes are too long.").optional(),
  consent: z.literal(true, { error: "Please agree to the privacy terms to book." }),
  marketingOptIn: z.boolean().optional(),
});

export type CustomerDetailsInput = z.infer<typeof customerDetailsSchema>;

/** "YYYY-MM-DD" */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date.");

/** "HH:MM" (24-hour) */
export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Select a valid time.");

/**
 * Full `POST /api/s/[slug]/appointments` body. Validate immediately before submitting so
 * a half-built wizard state can never reach the API.
 */
export const createAppointmentSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1, "Please choose a service.").max(10, "Choose at most 10 services."),
  barberId: z.string().min(1, "Please choose a barber."),
  date: dateStringSchema,
  startTime: timeStringSchema,
  customerName: customerNameSchema,
  customerPhone: phoneSchema,
  customerEmail: optionalEmailSchema,
  notes: z.string().trim().max(500).optional(),
  consent: z.literal(true, { error: "Please agree to the privacy terms to book." }),
  marketingOptIn: z.boolean().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/**
 * Collapse a ZodError into a `{ field: message }` map for rendering beside
 * inputs. Only the first error per field is kept.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
