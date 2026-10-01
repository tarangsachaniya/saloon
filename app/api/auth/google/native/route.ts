import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { hashSync } from "@/lib/server/password";
import { generateToken } from "@/lib/server/jwt";
import { handleRouteError } from "@/lib/server/http";
import { publicUser } from "@/lib/server/publicUser";
import { allowedAudiences, verifyGoogleIdToken } from "@/lib/server/googleIdToken";

/**
 * POST /api/auth/google/native { idToken } - sign in with Google from the
 * Android app, which does the Google sign-in itself and sends us the ID token.
 *
 * The token's signature, issuer, audience, expiry and verified email are
 * checked here. Account rules are the same as the browser flow:
 *   known googleId               -> sign in
 *   email unknown                -> create a CUSTOMER and sign in
 *   email of a password account  -> refused (409): sign in with the password
 *                                   (emails are not verified at sign-up, so an
 *                                   email match alone must not take over an account)
 *   OWNER / STAFF / SUPER_ADMIN  -> refused (403): those use password login
 * Same response shape as POST /api/auth/login.
 */

export const dynamic = "force-dynamic";

const refuse = (status: number, message: string, code?: string) =>
  NextResponse.json({ success: false, message, ...(code ? { code } : {}) }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    if (allowedAudiences().length === 0) {
      return refuse(503, "Google sign-in is not available right now.", "google_unavailable");
    }

    let idToken = "";
    try {
      const body = (await request.json()) as { idToken?: unknown };
      idToken = typeof body.idToken === "string" ? body.idToken : "";
    } catch {
      // fall through: empty token is rejected below
    }
    if (!idToken || idToken.length > 4096) return refuse(400, "Google sign-in failed. Please try again.", "google_failed");

    const google = await verifyGoogleIdToken(idToken);
    if (!google) return refuse(401, "Google sign-in failed. Please try again.", "google_failed");

    const session = (user: Parameters<typeof publicUser>[0]) =>
      NextResponse.json(
        { success: true, token: generateToken({ id: user.id, role: user.role, salonId: user.salonId }), user: publicUser(user, null) },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );

    const linked = await prisma.user.findUnique({ where: { googleId: google.sub } });
    if (linked) {
      if (!linked.enabled) return refuse(403, "This account is disabled.", "account_disabled");
      if (linked.role !== "CUSTOMER") return refuse(403, "Use your email and password to sign in.", "google_not_allowed");
      return session(linked);
    }

    const existing = await prisma.user.findUnique({ where: { email: google.email } });
    if (existing) {
      if (!existing.enabled) return refuse(403, "This account is disabled.", "account_disabled");
      if (existing.role !== "CUSTOMER" || existing.googleId) {
        return refuse(403, "Use your email and password to sign in.", "google_not_allowed");
      }
      return refuse(409, "An account with this email already exists. Sign in with your password instead.", "google_account_exists");
    }

    const fallbackName = google.name ?? google.email.split("@")[0];
    const firstName = google.givenName ?? fallbackName.split(/\s+/)[0] ?? fallbackName;
    const lastName = google.familyName ?? (google.givenName ? null : fallbackName.split(/\s+/).slice(1).join(" ") || null);
    try {
      const created = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: google.email,
          // Unusable random password: Google accounts sign in with Google, or set a real one via "Forgot password".
          password: hashSync(randomBytes(32).toString("hex")),
          role: "CUSTOMER",
          googleId: google.sub,
        },
      });
      return session(created);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return refuse(409, "Google sign-in failed. Please try again.", "google_failed");
      throw error;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
