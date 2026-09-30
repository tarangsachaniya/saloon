import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/server/prisma";
import { generateToken, validateToken } from "@/lib/server/jwt";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { publicUser } from "@/lib/server/publicUser";
import { openSecret, verifyTotp } from "@/lib/server/totp";
import { twoFactorSchema } from "@/lib/validation/auth";

/**
 * POST /api/auth/2fa/verify { challenge, code }
 *
 * Second step of login. `challenge` is the short-lived token /api/auth/login
 * issues after the password checks out (purpose "2fa"); a normal session token
 * is not accepted here. A valid TOTP code turns it into the real session.
 *
 * NOTE: like login, this has no brute-force throttle (no shared store in this
 * serverless setup); a 6-digit code is only as safe as the 5-minute challenge.
 */

export const dynamic = "force-dynamic";

const FAILED = () =>
  NextResponse.json(
    { success: false, message: "That code didn't work. Check your app and try again." },
    { status: 401 },
  );

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonStrict(request, twoFactorSchema.extend({ challenge: z.string().min(1) }));
    if ("error" in parsed) return parsed.error;

    const decoded = validateToken(parsed.data.challenge) as (jwt.JwtPayload & { purpose?: string }) | null;
    if (!decoded || decoded.purpose !== "2fa" || !decoded.id) {
      return NextResponse.json(
        { success: false, message: "Your sign-in timed out. Please sign in again." },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    const secret = user?.twoFactorSecret ? openSecret(user.twoFactorSecret) : null;
    if (!user || !user.enabled || !user.twoFactorEnabled || !secret) return FAILED();
    if (!verifyTotp(secret, parsed.data.code)) return FAILED();

    const salon = user.salonId
      ? await prisma.salon.findUnique({ where: { id: user.salonId }, select: { slug: true, name: true, isActive: true } })
      : null;
    if (user.role !== "SUPER_ADMIN" && user.role !== "CUSTOMER" && (!salon || !salon.isActive)) return FAILED();

    const token = generateToken({ id: user.id, role: user.role, salonId: user.salonId });
    return NextResponse.json({ success: true, token, user: publicUser(user, salon) });
  } catch (error) {
    return handleRouteError(error);
  }
}
