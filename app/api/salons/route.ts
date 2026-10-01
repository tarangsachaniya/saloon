import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { handleRouteError } from "@/lib/server/http";

/**
 * GET /api/salons?q= — public list of active salons for the mobile app's
 * discovery screen. Same query as the web `/salons` page; read-only, no auth.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";

    const salons = await prisma.salon.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { address: { contains: q, mode: "insensitive" } },
                { tagline: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 100,
      select: {
        slug: true,
        name: true,
        tagline: true,
        address: true,
        logoUrl: true,
        coverUrl: true,
        theme: true,
        accentColor: true,
      },
    });

    return NextResponse.json({ success: true, salons }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
