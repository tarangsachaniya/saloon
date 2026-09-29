import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import { hashSync } from "@/lib/server/password";
import { generateTemporaryPassword } from "@/lib/server/platform";
import prisma from "@/lib/server/prisma";

/**
 * POST /api/platform/salons/:id/owner-password — issue a new temporary password
 * for the salon's (first) OWNER, e.g. when they lost the original. Returned
 * once; only the hash is stored. SUPER_ADMIN only.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const owner = await prisma.user.findFirst({
      where: { salonId: id, role: "OWNER" },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    });
    if (!owner) {
      return NextResponse.json({ success: false, message: "This salon has no owner login." }, { status: 404 });
    }

    const temporaryPassword = generateTemporaryPassword();
    await prisma.user.update({
      where: { id: owner.id },
      data: { password: hashSync(temporaryPassword), passToken: null },
    });
    return NextResponse.json(
      { success: true, credentials: { email: owner.email, temporaryPassword } },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
