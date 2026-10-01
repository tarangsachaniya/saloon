import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/server/http";
import { loadSettings } from "@/lib/server/settings";
import { resolveSalon } from "@/lib/server/salon";

/**
 * GET /api/settings — public salon profile + the 7 opening-hour rows.
 * Port of `settingsController.getSettings`.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const gate = await resolveSalon(params);
    if ("error" in gate) return gate.error;
    const salon = gate.salon;

    const { settings, openingHours } = await loadSettings(salon.id);
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Salon settings have not been configured." },
        { status: 404 },
      );
    }
    // `look` lets non-web clients (the mobile app) render the salon in its own theme.
    const look = {
      theme: salon.theme,
      accentColor: salon.accentColor,
      tagline: salon.tagline,
      about: salon.about,
      coverUrl: salon.coverUrl,
      gallery: salon.gallery,
    };
    return NextResponse.json({ success: true, settings, openingHours, look }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
