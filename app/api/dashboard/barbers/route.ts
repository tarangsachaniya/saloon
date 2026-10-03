import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin, requireOwner } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { BARBER_DETAIL_INCLUDE, scalarFields, scheduleWrites } from "@/lib/server/barbers";
import { assertOwnImageUrls } from "@/lib/server/s3";
import { assertServicesInSalon } from "@/lib/server/salon";
import { createBarberBodySchema } from "@/lib/server/validation/barberValidation";

/**
 * POST /api/dashboard/barbers — port of `barberController.createBarber`.
 *
 * GET lists the caller's salon's roster (inactive included).
 */

export const dynamic = "force-dynamic";

/** GET /api/dashboard/barbers — every barber of the caller's salon, inactive included. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const barbers = await prisma.barber.findMany({
      where: { salonId: auth.salonId },
      orderBy: { id: "asc" },
      include: { services: { select: { id: true, name: true } } },
      // Commission rate is owner-only; staff and every other route never receive it.
      omit: {
        commissionPercentage: auth.user.role !== "OWNER",
        commissionType: auth.user.role !== "OWNER",
        commissionFlatAmount: auth.user.role !== "OWNER",
      },
    });
    return NextResponse.json({ success: true, barbers }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOwner(request);
    if ("error" in auth) return auth.error;
    const { salonId } = auth;

    const parsed = await parseJsonBody<Record<string, unknown>>(request, createBarberBodySchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

    // A photo must be one this salon uploaded (POST /api/uploads).
    assertOwnImageUrls(salonId, [body.photo as string | null | undefined]);

    if (Array.isArray(body.serviceIds)) {
      await assertServicesInSalon(salonId, body.serviceIds as string[]);
    }

    const nested = scheduleWrites(body);
    // `deleteMany` is meaningless on a create.
    for (const key of ["workingHours", "breaks", "daysOff"]) {
      const value = nested[key] as { create?: unknown } | undefined;
      if (value) nested[key] = { create: value.create };
    }
    if (nested.services) {
      nested.services = { connect: (body.serviceIds as string[]).map((id) => ({ id })) };
    }

    const barber = await prisma.barber.create({
      data: {
        salonId,
        ...scalarFields(body),
        specializations: Array.isArray(body.specializations) ? body.specializations : [],
        ...nested,
      } as never,
      include: BARBER_DETAIL_INCLUDE,
    });
    return NextResponse.json({ success: true, barber }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
