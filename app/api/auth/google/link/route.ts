import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { comSync } from "@/lib/server/password";
import { verifyPurposeToken } from "@/lib/server/jwt";
import { handleRouteError } from "@/lib/server/http";
import { publicUser } from "@/lib/server/publicUser";
import {
  OAUTH_LINK_COOKIE,
  clearOAuthCookie,
  readCookie,
  startSalonlySession,
} from "@/lib/server/googleOAuth";

/**
 * POST /api/auth/google/link { password } - finishes linking Google to an
 * existing Client account. Needs BOTH the signed ticket from a successful Google
 * sign-in (proves the Google identity) AND the account's password (proves the
 * Salonly account is theirs).
 */

export const dynamic = "force-dynamic";

const refuse = (status: number, message: string) =>
  NextResponse.json({ success: false, message }, { status });

export async function POST(request: Request) {
  try {
    const cookie = readCookie(request, OAUTH_LINK_COOKIE);
    const ticket = cookie
      ? verifyPurposeToken<{ userId: string; googleId: string }>(cookie, "google-link")
      : null;
    if (!ticket) return refuse(401, "This link expired. Please try Continue with Google again.");

    let password = "";
    try {
      const body = (await request.json()) as { password?: unknown };
      password = typeof body.password === "string" ? body.password : "";
    } catch {
      // fall through: an empty password is rejected below
    }
    if (!password) return refuse(400, "Enter your password.");

    const user = await prisma.user.findUnique({ where: { id: ticket.userId } });
    if (!user || !user.enabled || user.role !== "CUSTOMER" || user.googleId || !comSync(password, user.password)) {
      return refuse(401, "Incorrect password.");
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data: { googleId: ticket.googleId } });
    const response = NextResponse.json({ success: true, user: publicUser(updated, null) }, { status: 200 });
    startSalonlySession(response, updated);
    clearOAuthCookie(response, OAUTH_LINK_COOKIE);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return refuse(409, "That Google account is already linked to another Salonly account.");
    }
    return handleRouteError(error);
  }
}
