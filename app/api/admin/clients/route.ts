import { NextResponse, type NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireAdmin } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";

/**
 * GET /api/admin/clients?q=&take= — search by name or phone.
 * Port of `clientController.listClients`.
 *
 * Clients are created implicitly by the booking flow (upsert by phone), so
 * there is deliberately no POST route here — only the admin CRM reads.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) return auth.error;

    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get("q") || "").trim();
    const take = Math.min(Number(searchParams.get("take")) || 100, 500);

    const clients = await prisma.client.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {},
      orderBy: [{ lastVisit: "desc" }, { createdAt: "desc" }],
      take,
    });

    return NextResponse.json({ success: true, clients }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
