import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { hashSync } from "@/lib/server/password";
import { signPurposeToken, verifyPurposeToken } from "@/lib/server/jwt";
import {
  OAUTH_LINK_COOKIE,
  OAUTH_STATE_COOKIE,
  APP_TICKET_PURPOSE,
  APP_TICKET_TTL_SECONDS,
  OAUTH_TTL_SECONDS,
  appRedirect,
  clearOAuthCookie,
  googleConfig,
  readCookie,
  redeemCode,
  setOAuthCookie,
  startSalonlySession,
} from "@/lib/server/googleOAuth";

/**
 * GET /api/auth/google/callback - Google redirects here.
 *
 *   state/PKCE verified -> code redeemed server-side -> identity validated
 *   known googleId           -> sign in
 *   email unknown            -> create a CUSTOMER and sign in
 *   email of a CUSTOMER      -> must confirm with that account's password first
 *                               (Salonly does not verify emails at sign-up, so an
 *                               email match alone must not take over an account)
 *   email of OWNER/STAFF/SUPER_ADMIN -> refused: those use password login
 *
 * Every outcome is a redirect to a Salonly page; failures carry only a short
 * error code, never provider or database detail.
 */

export const dynamic = "force-dynamic";

type StatePayload = { state: string; verifier: string; redirectTo: string; client?: "app"; appChallenge?: string };

function fail(request: Request, code: string, app = false) {
  if (app) {
    const out = appRedirect({ error: code });
    clearOAuthCookie(out, OAUTH_STATE_COOKIE);
    return out;
  }
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
  clearOAuthCookie(response, OAUTH_STATE_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const cookie = readCookie(request, OAUTH_STATE_COOKIE);
    const saved = cookie ? verifyPurposeToken<StatePayload>(cookie, "google-oauth") : null;
    // Started by the Android app: every outcome goes back to its URL scheme.
    const isApp = saved?.client === "app" && !!saved.appChallenge;
    const failure = (code: string) => fail(request, code, isApp);

    if (params.get("error")) {
      return failure(params.get("error") === "access_denied" ? "google_cancelled" : "google_failed");
    }

    const cfg = googleConfig(request);
    const code = params.get("code");
    const state = params.get("state");
    if (!cfg || !code || !state || !saved || !sameString(state, saved.state)) {
      return failure(cfg ? "google_failed" : "google_unavailable");
    }

    const google = await redeemCode(cfg, code, saved.verifier);
    if (!google) return failure("google_failed");

    /** App sign-in succeeded: hand over a short-lived ticket bound to the app's challenge. */
    const toApp = (user: { id: string }) => {
      const out = appRedirect({
        ticket: signPurposeToken(APP_TICKET_PURPOSE, { userId: user.id, challenge: saved.appChallenge }, APP_TICKET_TTL_SECONDS),
      });
      clearOAuthCookie(out, OAUTH_STATE_COOKIE);
      return out;
    };

    const go = (path: string) => {
      const response = NextResponse.redirect(new URL(path, request.url));
      clearOAuthCookie(response, OAUTH_STATE_COOKIE);
      response.headers.set("Cache-Control", "no-store");
      return response;
    };
    const redirectParam = saved.redirectTo ? `redirectTo=${encodeURIComponent(saved.redirectTo)}` : "";
    const doneUrl = `/auth/google/done${redirectParam ? `?${redirectParam}` : ""}`;

    // 1. Already linked to this Google account.
    const linked = await prisma.user.findUnique({ where: { googleId: google.sub } });
    if (linked) {
      if (!linked.enabled) return failure("account_disabled");
      if (linked.role !== "CUSTOMER") return failure("google_not_allowed");
      if (isApp) return toApp(linked);
      const response = go(doneUrl);
      startSalonlySession(response, linked);
      return response;
    }

    // 2. The email already has an account: never merge on email alone.
    const existing = await prisma.user.findUnique({ where: { email: google.email } });
    if (existing) {
      if (!existing.enabled) return failure("account_disabled");
      if (existing.role !== "CUSTOMER" || existing.googleId) return failure("google_not_allowed");
      // Linking needs a password confirmation in the browser; the app asks the user to sign in with their password instead.
      if (isApp) return failure("google_account_exists");
      const response = go(
        `/login?google=link&email=${encodeURIComponent(existing.email)}${redirectParam ? `&${redirectParam}` : ""}`,
      );
      setOAuthCookie(
        response,
        OAUTH_LINK_COOKIE,
        signPurposeToken("google-link", { userId: existing.id, googleId: google.sub }, OAUTH_TTL_SECONDS),
      );
      return response;
    }

    // 3. New visitor: a normal Client account. The role is fixed; Google never picks it.
    const fallbackName = google.name ?? google.email.split("@")[0];
    const firstName = google.givenName ?? fallbackName.split(/\s+/)[0] ?? fallbackName;
    const lastName =
      google.familyName ?? (google.givenName ? null : fallbackName.split(/\s+/).slice(1).join(" ") || null);
    try {
      const created = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: google.email,
          // Unusable random password: Google-created accounts sign in with Google,
          // or set a real password through "Forgot password".
          password: hashSync(randomBytes(32).toString("hex")),
          role: "CUSTOMER",
          googleId: google.sub,
        },
      });
      if (isApp) return toApp(created);
      const response = go(doneUrl);
      startSalonlySession(response, created);
      return response;
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return failure("google_failed");
      throw error;
    }
  } catch (error) {
    console.error("[google-auth] callback failed:", error instanceof Error ? error.name : "unknown");
    // Best effort: if the state cookie says this was the app, send the error there.
    const cookie = readCookie(request, OAUTH_STATE_COOKIE);
    const saved = cookie ? verifyPurposeToken<StatePayload>(cookie, "google-oauth") : null;
    return fail(request, "google_failed", saved?.client === "app");
  }
}
