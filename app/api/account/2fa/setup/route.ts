import QRCode from "qrcode";
import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireCustomer } from "@/lib/server/account";
import { handleRouteError } from "@/lib/server/http";
import { generateTotpSecret, otpauthUri, sealSecret } from "@/lib/server/totp";
import { BRAND } from "@/lib/brand";

/**
 * POST /api/account/2fa/setup — start enrolling an authenticator app.
 *
 * Stores a fresh (sealed) secret with `twoFactorEnabled` still false, so login
 * is unaffected until /enable proves the app produces valid codes. The secret
 * is returned exactly once, here, for the QR code / manual entry; it is never
 * readable again through any endpoint. Re-running replaces a pending secret.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireCustomer(request);
    if ("error" in auth) return auth.error;
    if (auth.user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, message: "Two-factor authentication is already enabled." },
        { status: 409 },
      );
    }

    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { twoFactorSecret: sealSecret(secret), twoFactorEnabled: false },
    });

    const uri = otpauthUri(secret, auth.user.email, BRAND.name);
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 240 });
    return NextResponse.json({ success: true, secret, qr });
  } catch (error) {
    return handleRouteError(error);
  }
}
