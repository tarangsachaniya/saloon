import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import prisma from "@/lib/server/prisma";
import { updateReleaseSchema } from "@/lib/server/validation/releaseValidation";

/** PATCH /api/platform/releases/:id - activate/deactivate or flip `mandatory`. SUPER_ADMIN only. */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonStrict(request, updateReleaseSchema);
    if ("error" in parsed) return parsed.error;

    const { id } = await params;
    const existing = await prisma.appRelease.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, message: "Release not found." }, { status: 404 });

    const release = await prisma.appRelease.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ success: true, release });
  } catch (error) {
    return handleRouteError(error);
  }
}
