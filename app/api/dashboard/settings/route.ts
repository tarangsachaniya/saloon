import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin, requireOwner } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { assertOwnImageUrls } from "@/lib/server/s3";
import { loadSettings, POLICY_FIELDS, PROFILE_FIELDS } from "@/lib/server/settings";
import { updateSettingsBodySchema } from "@/lib/server/validation/settingsValidation";

/**
 * PATCH /api/admin/settings — salon profile, booking policy and/or hours.
 * Port of `settingsController.updateSettings`, including the single
 * transaction that upserts the settings singleton and each opening-hour row.
 */

export const dynamic = "force-dynamic";

/** The salon's uploaded images, returned next to the settings so editors can show and replace them. */
async function loadImages(salonId: string) {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { logoUrl: true, coverUrl: true, gallery: true },
  });
  return { logo: salon?.logoUrl ?? null, coverUrl: salon?.coverUrl ?? null, gallery: salon?.gallery ?? [] };
}

/** GET /api/dashboard/settings — the caller's salon profile, booking policy and hours. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const { settings, openingHours } = await loadSettings(auth.salonId);
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Salon not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { success: true, settings, openingHours, images: await loadImages(auth.salonId) },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireOwner(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<Record<string, unknown>>(
      request,
      updateSettingsBodySchema,
    );
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

    const { salonId } = auth;

    const profile: Record<string, unknown> = {};
    for (const field of PROFILE_FIELDS) {
      if (body[field] !== undefined) profile[field] = body[field];
    }
    if (body.logo !== undefined) profile.logoUrl = body.logo;
    if (body.coverUrl !== undefined) profile.coverUrl = body.coverUrl;
    if (body.gallery !== undefined) profile.gallery = body.gallery;

    // New image URLs must be ones this salon uploaded; values already stored stay valid.
    if (body.logo !== undefined || body.coverUrl !== undefined || body.gallery !== undefined) {
      const current = await loadImages(salonId);
      assertOwnImageUrls(
        salonId,
        [body.logo as string | null | undefined, body.coverUrl as string | null | undefined, ...((body.gallery as string[] | undefined) ?? [])],
        [current.logo, current.coverUrl, ...current.gallery],
      );
    }
    // `mapUrl` is a direct Salon column — already included via PROFILE_FIELDS.

    const policy: Record<string, unknown> = {};
    for (const field of POLICY_FIELDS) {
      if (body[field] !== undefined) policy[field] = body[field];
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(profile).length > 0) {
        await tx.salon.update({ where: { id: salonId }, data: profile as never });
      }
      if (Object.keys(policy).length > 0) {
        await tx.salonSettings.upsert({
          where: { salonId },
          update: policy as never,
          create: { salonId, ...policy } as never,
        });
      }

      if (Array.isArray(body.openingHours)) {
        for (const hour of body.openingHours as Array<Record<string, unknown>>) {
          const values = {
            isOpen: hour.isOpen !== undefined ? (hour.isOpen as boolean) : true,
            openTime: hour.openTime as number,
            closeTime: hour.closeTime as number,
          };
          await tx.salonOpeningHour.upsert({
            where: { salonId_weekday: { salonId, weekday: hour.weekday as number } },
            update: values,
            create: { salonId, weekday: hour.weekday as number, ...values },
          });
        }
      }
    });

    const { settings, openingHours } = await loadSettings(salonId);
    return NextResponse.json(
      { success: true, settings, openingHours, images: await loadImages(salonId) },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
