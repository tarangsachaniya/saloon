import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { BARBER_DETAIL_INCLUDE, scalarFields, scheduleWrites } from "@/lib/server/barbers";
import { updateBarberBodySchema } from "@/lib/server/validation/barberValidation";

/**
 * PATCH  /api/admin/barbers/:id — port of `barberController.updateBarber`.
 *                                 Any supplied schedule array replaces the old
 *                                 one wholesale.
 * DELETE /api/admin/barbers/:id — port of `barberController.deleteBarber`.
 */

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const parsed = await parseJsonBody<Record<string, unknown>>(request, updateBarberBodySchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

    const barber = await prisma.barber.update({
      where: { id },
      data: { ...scalarFields(body), ...scheduleWrites(body) } as never,
      include: BARBER_DETAIL_INCLUDE,
    });
    return NextResponse.json({ success: true, barber }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * A barber with appointment history cannot be hard-deleted (the rows reference
 * them), so they are deactivated instead - which also removes them from the
 * customer-facing list. `?hard=true` on a barber with no history really deletes.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    const existing = await prisma.barber.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Barber not found." },
        { status: 404 },
      );
    }

    const appointmentCount = await prisma.appointment.count({ where: { barberId: id } });

    if (String(request.nextUrl.searchParams.get("hard")) === "true") {
      if (appointmentCount > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `This barber has ${appointmentCount} appointment(s) on record and cannot be permanently deleted. Deactivate them instead.`,
          },
          { status: 409 },
        );
      }
      await prisma.barber.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Barber deleted." }, { status: 200 });
    }

    const barber = await prisma.barber.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json(
      { success: true, message: "Barber deactivated.", barber },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
