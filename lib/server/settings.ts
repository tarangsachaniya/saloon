import "server-only";

import prisma from "./prisma";
import type { SalonSettings } from "@/lib/booking/types";

/**
 * Per-salon settings.
 *
 * Storage is split — profile fields live on `Salon`, booking policy on
 * `SalonSettings` — but the wire shape the frontend reads is still ONE merged
 * `settings` object plus `openingHours`, so `lib/api/settings.ts` and the
 * booking UI are unaffected.
 */

/** Fields that belong to the `Salon` profile (name/logo/contact). `logo` -> `Salon.logoUrl`. */
export const PROFILE_FIELDS = ["name", "phone", "email", "address", "mapUrl"] as const;

/** Fields that belong to `SalonSettings` (booking policy). */
export const POLICY_FIELDS = [
  "slotIntervalMinutes",
  "minimumAdvanceBookingMinutes",
  "maximumAdvanceBookingDays",
  "cancellationWindowMinutes",
] as const;

const POLICY_DEFAULTS = {
  slotIntervalMinutes: 15,
  minimumAdvanceBookingMinutes: 30,
  maximumAdvanceBookingDays: 30,
  cancellationWindowMinutes: 60,
};

export async function loadSettings(salonId: string) {
  const [salon, policy, openingHours] = await Promise.all([
    prisma.salon.findUnique({ where: { id: salonId } }),
    prisma.salonSettings.findUnique({ where: { salonId } }),
    prisma.salonOpeningHour.findMany({ where: { salonId }, orderBy: { weekday: "asc" } }),
  ]);

  if (!salon) return { settings: null, openingHours };

  const p = policy ?? POLICY_DEFAULTS;
  const settings = {
    name: salon.name,
    logo: salon.logoUrl,
    phone: salon.phone,
    email: salon.email,
    address: salon.address,
    mapUrl: salon.mapUrl ?? null,
    slotIntervalMinutes: p.slotIntervalMinutes,
    minimumAdvanceBookingMinutes: p.minimumAdvanceBookingMinutes,
    maximumAdvanceBookingDays: p.maximumAdvanceBookingDays,
    cancellationWindowMinutes: p.cancellationWindowMinutes,
  };
  return { settings, openingHours };
}

/**
 * The merged `{...settings, openingHours}` shape for Server Components reading
 * Prisma directly. Null when the salon does not exist.
 */
export async function getSalonSettingsView(salonId: string): Promise<SalonSettings | null> {
  const { settings, openingHours } = await loadSettings(salonId);
  if (!settings) return null;
  return {
    ...settings,
    openingHours: openingHours.map((hour) => ({
      weekday: hour.weekday,
      isOpen: hour.isOpen,
      openTime: hour.openTime,
      closeTime: hour.closeTime,
    })),
  };
}
