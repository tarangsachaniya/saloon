import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { BARBER_DETAIL_INCLUDE, scalarFields, scheduleWrites } from "@/lib/server/barbers";
import { createBarberBodySchema } from "@/lib/server/validation/barberValidation";

/**
 * POST /api/admin/barbers — port of `barberController.createBarber`.
 *
 * As with services, there is no admin LIST route: the admin roster is
 * `GET /api/barbers?includeInactive=true` with a token attached.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<Record<string, unknown>>(request, createBarberBodySchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

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
