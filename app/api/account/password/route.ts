import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireCustomer } from "@/lib/server/account";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { comSync, hashSync } from "@/lib/server/password";
import { changePasswordSchema } from "@/lib/validation/account";

/**
 * POST /api/account/password { currentPassword, newPassword, confirmPassword }
 * Requires the current password even though the caller is signed in, so a
 * stolen session alone cannot lock the owner out. Also voids any pending
 * password-reset link.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireCustomer(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonStrict(request, changePasswordSchema);
    if ("error" in parsed) return parsed.error;
    const { currentPassword, newPassword } = parsed.data;

    if (!comSync(currentPassword, auth.user.password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect current password.",
          fieldErrors: { currentPassword: "Incorrect current password." },
        },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { password: hashSync(newPassword), passToken: null },
    });
    return NextResponse.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    return handleRouteError(error);
  }
}
