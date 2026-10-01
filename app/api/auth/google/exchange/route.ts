import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { generateToken, verifyPurposeToken } from "@/lib/server/jwt";
import { handleRouteError } from "@/lib/server/http";
import { publicUser } from "@/lib/server/publicUser";
import { APP_TICKET_PURPOSE, challengeOf } from "@/lib/server/googleOAuth";

/**
 * POST /api/auth/google/exchange { ticket, verifier } - the Android app trades
 * the ticket it received on its URL scheme for a normal session.
 *
 * The ticket was issued by the Google callback (so Google vouched for the
 * identity) and is bound to sha256(verifier), a secret only the app that
 * started the flow knows. Anything else that learns the ticket (another app
 * registered on the same URL scheme) cannot redeem it. Same session token and
 * response shape as POST /api/auth/login.
 */

export const dynamic = "force-dynamic";

const refuse = (status: number, message: string) =>
  NextResponse.json({ success: false, message }, { status, headers: { "Cache-Control": "no-store" } });

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: Request) {
  try {
    let ticket = "";
    let verifier = "";
    try {
      const body = (await request.json()) as { ticket?: unknown; verifier?: unknown };
      ticket = typeof body.ticket === "string" ? body.ticket : "";
      verifier = typeof body.verifier === "string" ? body.verifier : "";
    } catch {
      // fall through: empty values are rejected below
    }
    if (!ticket || verifier.length < 32 || verifier.length > 200) {
      return refuse(400, "Sign-in could not be completed. Please try again.");
    }

    const claims = verifyPurposeToken<{ userId: string; challenge: string }>(ticket, APP_TICKET_PURPOSE);
    if (!claims || !sameString(challengeOf(verifier), claims.challenge)) {
      return refuse(401, "This sign-in expired. Please try Continue with Google again.");
    }

    const user = await prisma.user.findUnique({ where: { id: claims.userId } });
    if (!user || !user.enabled || user.role !== "CUSTOMER") {
      return refuse(403, "This account cannot sign in with Google.");
    }

    const token = generateToken({ id: user.id, role: user.role, salonId: user.salonId });
    return NextResponse.json(
      { success: true, token, user: publicUser(user, null) },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
