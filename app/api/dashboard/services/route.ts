import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { listServices, SERVICE_INCLUDE } from "@/lib/server/services";
import { assertBarbersInSalon } from "@/lib/server/salon";
import { createServiceBodySchema } from "@/lib/server/validation/serviceValidation";

/**
 * POST /api/dashboard/services — port of `serviceController.createService`.
 *
 * GET lists the caller's salon's services (inactive included); the salon comes
 * from the authenticated user, never from the URL.
 */

export const dynamic = "force-dynamic";

/** The scalar columns a request body may set, straight from the controller. */
function scalarFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const field of ["name", "description", "price", "durationMinutes", "category", "isActive"]) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

/** GET /api/dashboard/services — every service of the caller's salon, inactive included. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const services = await listServices(auth.salonId, { includeInactive: true });
    return NextResponse.json({ success: true, services }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;
    const { salonId } = auth;

    const parsed = await parseJsonBody<Record<string, unknown>>(request, createServiceBodySchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

    if (Array.isArray(body.barberIds)) {
      await assertBarbersInSalon(salonId, body.barberIds as string[]);
    }

    const service = await prisma.service.create({
      data: {
        salonId,
        ...scalarFields(body),
        ...(Array.isArray(body.barberIds)
          ? { barbers: { connect: (body.barberIds as string[]).map((id) => ({ id })) } }
          : {}),
      } as never,
      include: SERVICE_INCLUDE,
    });
    return NextResponse.json({ success: true, service }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
