import "server-only";

import prisma from "./prisma";
import type { SalonSettings } from "@/lib/booking/types";

/** Port of `loadSettings` in `backend/controller/settingsController.js`. */

export const SETTINGS_ID = 1;

export const SETTINGS_FIELDS = [
  "name",
  "logo",
  "phone",
  "email",
  "address",
  "slotIntervalMinutes",
  "minimumAdvanceBookingMinutes",
  "maximumAdvanceBookingDays",
  "cancellationWindowMinutes",
] as const;

export async function loadSettings() {
  const [settings, openingHours] = await Promise.all([
    prisma.salonSettings.findUnique({ where: { id: SETTINGS_ID } }),
    prisma.salonOpeningHour.findMany({ orderBy: { weekday: "asc" } }),
  ]);
  return { settings, openingHours };
}

/**
 * The merged `{...settings, openingHours}` shape that `lib/api/settings.ts`
 * builds for its callers — for Server Components reading Prisma directly.
 * Returns null when the salon has not been configured, matching the 404 the
 * HTTP route answers in that case.
 */
export async function getSalonSettingsView(): Promise<SalonSettings | null> {
  const { settings, openingHours } = await loadSettings();
  if (!settings) return null;
  return {
    name: settings.name,
    logo: settings.logo,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    slotIntervalMinutes: settings.slotIntervalMinutes,
    minimumAdvanceBookingMinutes: settings.minimumAdvanceBookingMinutes,
    maximumAdvanceBookingDays: settings.maximumAdvanceBookingDays,
    cancellationWindowMinutes: settings.cancellationWindowMinutes,
    openingHours: openingHours.map((hour) => ({
      weekday: hour.weekday,
      isOpen: hour.isOpen,
      openTime: hour.openTime,
      closeTime: hour.closeTime,
    })),
  };
}
