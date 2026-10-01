import "server-only";

import { THEME_IDS } from "@/lib/themes";
import { z } from "./common";

/** Lowercase words joined by single hyphens, 2-60 chars (mirrors `isValidSlug`). */
export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Use lowercase letters, numbers and single hyphens." });

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: "Use a colour like #7d8f7a." });
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

/**
 * A billing plan. MONTHLY needs a fee; COMMISSION needs a type and value
 * (PERCENT: 0-100 of completed-appointment value, FLAT: amount per completed
 * booking). Amounts are rupees with up to 2 decimals.
 */
const money = (max: number) =>
  z
    .number()
    .finite()
    .min(0)
    .max(max)
    .refine((v) => Math.round(v * 100) === v * 100, { message: "At most 2 decimal places." });

export const billingPlanSchema = z.union([
  z.object({
    planType: z.literal("MONTHLY"),
    monthlyFee: money(10_000_000),
  }),
  z.object({
    planType: z.literal("COMMISSION"),
    commissionType: z.literal("PERCENT"),
    commissionValue: money(100).refine((v) => v > 0, { message: "Must be more than 0%." }),
  }),
  z.object({
    planType: z.literal("COMMISSION"),
    commissionType: z.literal("FLAT"),
    commissionValue: money(1_000_000).refine((v) => v > 0, { message: "Must be more than 0." }),
  }),
]);

export type BillingPlanInput = z.infer<typeof billingPlanSchema>;

const salonProfile = {
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  tagline: optionalText(160),
  about: optionalText(2000),
  phone: optionalText(30),
  email: z.email().max(180).optional().nullable(),
  address: optionalText(300),
  mapUrl: z.string().max(2000).optional().nullable(),
  theme: z.enum(THEME_IDS),
  accentColor: hexColor.optional().nullable(),
};

export const createSalonSchema = z.object({
  salon: z.object(salonProfile),
  owner: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: optionalText(80),
    email: z.email().max(180),
    phoneNumber: optionalText(30),
  }),
  plan: billingPlanSchema,
});

export type CreateSalonInput = z.infer<typeof createSalonSchema>;

export const updateSalonSchema = z
  .object({
    ...Object.fromEntries(Object.entries(salonProfile).map(([k, v]) => [k, v.optional()])),
    isActive: z.boolean().optional(),
    // Image URLs must come from POST /api/uploads for this salon (checked in the route).
    logoUrl: z.string().max(500).optional().nullable(),
    coverUrl: z.string().max(500).optional().nullable(),
    gallery: z.array(z.string().max(500)).max(6).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });

export const newPlanSchema = z.object({
  plan: billingPlanSchema,
  /** "YYYY-MM-DD"; defaults to today. A plan applies from the start of that day. */
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
