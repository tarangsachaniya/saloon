import { z } from "zod";

export const createReleaseSchema = z.object({
  versionCode: z.number().int().min(1).max(2_000_000_000),
  versionName: z.string().trim().min(1).max(32),
  apkKey: z.string().min(1).max(200),
  sha256: z.string().regex(/^[0-9a-f]{64}$/i, "sha256 must be 64 hex characters."),
  notes: z.string().trim().max(2000).optional(),
  mandatory: z.boolean().default(false),
});

export const updateReleaseSchema = z
  .object({ isActive: z.boolean().optional(), mandatory: z.boolean().optional() })
  .refine((v) => v.isActive !== undefined || v.mandatory !== undefined, "Nothing to update.");
