import "server-only";

import { z, minuteOfDay, weekday } from "./common";

// Port of `backend/model/validation/settingsValidation.js`.

const openingHour = z
  .object({
    weekday,
    isOpen: z.boolean().optional(),
    openTime: minuteOfDay,
    closeTime: minuteOfDay,
  })
  .refine((v) => v.isOpen === false || v.openTime < v.closeTime, {
    message: "openTime must be before closeTime",
  });

export const updateSettingsBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    logo: z.string().max(500).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    email: z.email().max(180).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    mapUrl: z.string().max(2000).optional().nullable(),
    slotIntervalMinutes: z.number().int().min(5).max(120).optional(),
    minimumAdvanceBookingMinutes: z.number().int().min(0).max(10080).optional(),
    maximumAdvanceBookingDays: z.number().int().min(1).max(365).optional(),
    cancellationWindowMinutes: z.number().int().min(0).max(10080).optional(),
    openingHours: z.array(openingHour).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });
