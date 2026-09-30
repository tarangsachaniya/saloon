import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireCustomer } from "@/lib/server/account";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { openSecret, verifyTotp } from "@/lib/server/totp";
import { codeSchema } from "@/lib/validation/account";

/** POST /api/account/2fa/enable { code } — confirm the authenticator works, then turn 2FA on. */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireCustomer(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonStrict(request, codeSchema);
    if ("error" in parsed) return parsed.error;

    const secret = auth.user.twoFactorSecret ? openSecret(auth.user.twoFactorSecret) : null;
    if (auth.user.twoFactorEnabled || !secret) {
      return NextResponse.json(
        { success: false, message: "Start the setup again to continue." },
        { status: 409 },
      );
    }
    if (!verifyTotp(secret, parsed.data.code)) {
      return NextResponse.json(
        {
          success: false,
          message: "That code didn't work. Check your app and try again.",
          fieldErrors: { code: "That code didn't work. Check your app and try again." },
        },
        { status: 400 },
      );
    }

    await prisma.user.update({ where: { id: auth.user.id }, data: { twoFactorEnabled: true } });
    return NextResponse.json({ success: true, message: "Two-factor authentication enabled." });
  } catch (error) {
    return handleRouteError(error);
  }
}
