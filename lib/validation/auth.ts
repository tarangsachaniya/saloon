import { z } from "zod";

import { phoneSchema } from "./booking";

/**
 * Customer auth form schemas. Shared by the forms (instant feedback) and the
 * `/api/auth/*` routes (the real check) so the two can never disagree.
 */

export const PASSWORD_HINT = "At least 8 characters, with a letter and a number.";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[A-Za-z]/, "Password needs at least one letter.")
  .regex(/[0-9]/, "Password needs at least one number.");

export const emailSchema = z.email("Enter a valid email address.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80, "Name is too long."),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const twoFactorSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});
