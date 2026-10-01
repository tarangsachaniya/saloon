import { NextResponse } from "next/server";

import { signPurposeToken } from "@/lib/server/jwt";
import {
  GOOGLE_AUTH_URL,
  GOOGLE_SCOPE,
  OAUTH_STATE_COOKIE,
  OAUTH_TTL_SECONDS,
  googleConfig,
  newPkce,
  safeRedirectPath,
  setOAuthCookie,
} from "@/lib/server/googleOAuth";

/**
 * GET /api/auth/google/start - begins "Continue with Google".
 * Stores a random `state` + PKCE verifier in a short-lived HttpOnly cookie and
 * sends the browser to Google. Nothing secret reaches the URL.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cfg = googleConfig(request);
  if (!cfg) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", request.url));
  }
  try {
    const { verifier, challenge, state } = newPkce();
    const redirectTo = safeRedirectPath(new URL(request.url).searchParams.get("redirectTo"));

    const url = new URL(GOOGLE_AUTH_URL);
    url.search = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPE,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();

    const response = NextResponse.redirect(url);
    setOAuthCookie(
      response,
      OAUTH_STATE_COOKIE,
      signPurposeToken("google-oauth", { state, verifier, redirectTo }, OAUTH_TTL_SECONDS),
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_failed", request.url));
  }
}
