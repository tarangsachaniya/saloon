import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireCustomer } from "@/lib/server/account";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { comSync } from "@/lib/server/password";
import { openSecret, verifyTotp } from "@/lib/server/totp";
import { disableTwoFactorSchema } from "@/lib/validation/account";

/**
 * POST /api/account/2fa/disable { password, code }
 * Needs BOTH the password and a current authenticator code, so a hijacked
 * session cannot strip the second factor. The stored secret is erased.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireCustomer(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonStrict(request, disableTwoFactorSchema);
    if ("error" in parsed) return parsed.error;

    if (!auth.user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, message: "Two-factor authentication is not enabled." },
        { status: 409 },
      );
    }
    if (!comSync(parsed.data.password, auth.user.password)) {
      return NextResponse.json(
        { success: false, message: "Incorrect password.", fieldErrors: { password: "Incorrect password." } },
        { status: 400 },
      );
    }
    const secret = auth.user.twoFactorSecret ? openSecret(auth.user.twoFactorSecret) : null;
    if (!secret || !verifyTotp(secret, parsed.data.code)) {
      return NextResponse.json(
        {
          success: false,
          message: "That code didn't work. Check your app and try again.",
          fieldErrors: { code: "That code didn't work. Check your app and try again." },
        },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return NextResponse.json({ success: true, message: "Two-factor authentication disabled." });
  } catch (error) {
    return handleRouteError(error);
  }
}
