import { z } from "zod";

import { emailSchema, passwordSchema } from "./auth";
import { phoneSchema } from "./booking";

/** Account form schemas, shared by the forms and the `/api/account/*` routes. */

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80, "Name is too long."),
  email: emailSchema,
  phone: phoneSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one.",
  });

export const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export const disableTwoFactorSchema = codeSchema.extend({
  password: z.string().min(1, "Enter your password."),
});
