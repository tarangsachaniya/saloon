import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { SERVICE_INCLUDE } from "@/lib/server/services";
import { updateServiceBodySchema } from "@/lib/server/validation/serviceValidation";

/**
 * PATCH  /api/admin/services/:id — port of `serviceController.updateService`
 * DELETE /api/admin/services/:id — port of `serviceController.deleteService`
 */

export const dynamic = "force-dynamic";

function scalarFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const field of ["name", "description", "price", "durationMinutes", "category", "isActive"]) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const parsed = await parseJsonBody<Record<string, unknown>>(request, updateServiceBodySchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...scalarFields(body),
        ...(Array.isArray(body.barberIds)
          ? { barbers: { set: (body.barberIds as string[]).map((barberId) => ({ id: barberId })) } }
          : {}),
      } as never,
      include: SERVICE_INCLUDE,
    });
    return NextResponse.json({ success: true, service }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Soft-delete by default: past Appointment rows reference the service, so a
 * hard delete would either fail on the FK or destroy history. `?hard=true`
 * permanently deletes a service that was never booked.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Service not found." },
        { status: 404 },
      );
    }

    const appointmentCount = await prisma.appointment.count({ where: { serviceId: id } });

    if (String(request.nextUrl.searchParams.get("hard")) === "true") {
      if (appointmentCount > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `This service is referenced by ${appointmentCount} appointment(s) and cannot be permanently deleted. Deactivate it instead.`,
          },
          { status: 409 },
        );
      }
      await prisma.service.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Service deleted." }, { status: 200 });
    }

    const service = await prisma.service.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json(
      { success: true, message: "Service deactivated.", service },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
