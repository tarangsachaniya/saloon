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
 * `GET /api/settings` — public salon profile plus the booking rules the wizard
 * needs (slot interval, advance-booking bounds, opening hours).
 */
export async function getSettings(options?: RequestOptions): Promise<SalonSettings> {
  const data = await get<SettingsEnvelope>("/settings", { auth: false, ...options });
  return mergeSettings(data);
}

/** `PATCH /api/admin/settings` */
export async function updateSettings(
  payload: UpdateSalonSettingsPayload,
  options?: RequestOptions,
): Promise<SalonSettings> {
  const data = await patch<SettingsEnvelope>("/admin/settings", payload, options);
  return mergeSettings(data);
}
