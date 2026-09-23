import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { loadSettings, SETTINGS_FIELDS, SETTINGS_ID } from "@/lib/server/settings";
import { updateSettingsBodySchema } from "@/lib/server/validation/settingsValidation";

/**
 * PATCH /api/admin/settings — salon profile, booking policy and/or hours.
 * Port of `settingsController.updateSettings`, including the single
 * transaction that upserts the settings singleton and each opening-hour row.
 */

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<Record<string, unknown>>(
      request,
      updateSettingsBodySchema,
    );
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

    const data: Record<string, unknown> = {};
    for (const field of SETTINGS_FIELDS) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.salonSettings.upsert({
          where: { id: SETTINGS_ID },
          update: data as never,
          create: { id: SETTINGS_ID, name: (data.name as string) || "My Salon", ...data } as never,
        });
      }

      if (Array.isArray(body.openingHours)) {
        for (const hour of body.openingHours as Array<Record<string, unknown>>) {
          await tx.salonOpeningHour.upsert({
            where: { weekday: hour.weekday as number },
            update: {
              isOpen: hour.isOpen !== undefined ? (hour.isOpen as boolean) : true,
              openTime: hour.openTime as number,
              closeTime: hour.closeTime as number,
            },
            create: {
              weekday: hour.weekday as number,
              isOpen: hour.isOpen !== undefined ? (hour.isOpen as boolean) : true,
              openTime: hour.openTime as number,
              closeTime: hour.closeTime as number,
            },
          });
        }
      }
    });

    const { settings, openingHours } = await loadSettings();
    return NextResponse.json({ success: true, settings, openingHours }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
