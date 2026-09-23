import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { SERVICE_INCLUDE } from "@/lib/server/services";
import { createServiceBodySchema } from "@/lib/server/validation/serviceValidation";

/**
 * POST /api/admin/services — port of `serviceController.createService`.
 *
 * There is deliberately no admin LIST route here: the admin service list is
 * `GET /api/services?includeInactive=true` with a token attached, exactly as in
 * the Express app (and as `lib/api/services.ts`'s `getAdminServices` calls it).
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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<Record<string, unknown>>(request, createServiceBodySchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

    const service = await prisma.service.create({
      data: {
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
