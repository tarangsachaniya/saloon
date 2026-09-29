import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireUser } from "@/lib/server/auth";
import { publicUser } from "@/lib/server/publicUser";

/**
 * GET /api/auth/me — lets the dashboard/platform app validate a stored token on boot.
 * Port of `loginController.me` behind the `verification` gate.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const salon = user.salonId
    ? await prisma.salon.findUnique({
        where: { id: user.salonId },
        select: { slug: true, name: true, isActive: true },
      })
    : null;
  // A deactivated salon locks its staff out of the dashboard.
  if (user.role !== "SUPER_ADMIN" && (!salon || !salon.isActive)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ success: true, user: publicUser(user, salon) }, { status: 200 });
}
