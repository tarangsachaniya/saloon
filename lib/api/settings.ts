import { get, patch } from "./client";
import type {
  OpeningHour,
  SalonSettings,
  UpdateSalonSettingsPayload,
} from "@/lib/booking/types";
import type { RequestOptions } from "./client";

/**
 * The backend returns `settings` and `openingHours` as sibling objects
 * (`{success, settings, openingHours}`), not `settings.openingHours` — both
 * functions below merge them so callers can keep using the single
 * `SalonSettings` shape (with `openingHours` nested) declared in `types.ts`.
 */
type SettingsEnvelope = {
  success: true;
  settings: Omit<SalonSettings, "openingHours">;
  openingHours: OpeningHour[];
};

function mergeSettings(data: SettingsEnvelope): SalonSettings {
  return { ...data.settings, openingHours: data.openingHours };
}

/**
 * `GET /api/s/:slug/settings` — a salon's public profile plus the booking rules
 * the wizard needs (slot interval, advance-booking bounds, opening hours).
 */
export async function getSettings(
  salonSlug: string,
  options?: RequestOptions,
): Promise<SalonSettings> {
  const data = await get<SettingsEnvelope>(
    `/s/${encodeURIComponent(salonSlug)}/settings`,
    { auth: false, ...options },
  );
  return mergeSettings(data);
}

/** `GET /api/dashboard/settings` — the signed-in staff's own salon. */
export async function getAdminSettings(options?: RequestOptions): Promise<SalonSettings> {
  const data = await get<SettingsEnvelope>("/dashboard/settings", options);
  return mergeSettings(data);
}

/** `PATCH /api/dashboard/settings` */
export async function updateSettings(
  payload: UpdateSalonSettingsPayload,
  options?: RequestOptions,
): Promise<SalonSettings> {
  const data = await patch<SettingsEnvelope>("/dashboard/settings", payload, options);
  return mergeSettings(data);
}
