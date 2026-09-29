import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";

/**
 * GET /api/dashboard/clients/:id — client record + full appointment history.
 * Port of `clientController.getClient`. `client` and `appointments` come back
 * as siblings, which is what `lib/api/clients.ts` merges.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;
    const { salonId } = auth;

    const { id } = await params;

    const client = await prisma.client.findFirst({ where: { id, salonId } });
    if (!client) {
      return NextResponse.json(
        { success: false, message: "Client not found." },
        { status: 404 },
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: { salonId, clientId: client.id },
      include: { barber: true, service: true },
      orderBy: { appointmentDate: "desc" },
    });

    return NextResponse.json({ success: true, client, appointments }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
