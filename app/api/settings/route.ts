import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/server/http";
import { loadSettings } from "@/lib/server/settings";

/**
 * GET /api/settings — public salon profile + the 7 opening-hour rows.
 * Port of `settingsController.getSettings`.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { settings, openingHours } = await loadSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Salon settings have not been configured." },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, settings, openingHours }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
