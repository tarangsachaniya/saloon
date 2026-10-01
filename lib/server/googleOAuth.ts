import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/token";
import { generateToken } from "./jwt";

/**
 * Google sign-in (OAuth 2.0 authorization-code flow + PKCE + OIDC), done by hand
 * against Google's endpoints so no auth library or second session system is
 * needed. The result is the SAME Salonly session as password login: a
 * `generateToken` JWT in the `sbs_admin_token` cookie.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (server only), optional
 * GOOGLE_REDIRECT_URI (otherwise `<request origin>/api/auth/google/callback`).
 */

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
/** Only identity: no Google API access is requested. */
export const GOOGLE_SCOPE = "openid email profile";

/** Cookie holding the in-flight OAuth state (CSRF + PKCE verifier). */
export const OAUTH_STATE_COOKIE = "sbs_oauth";
/** Cookie holding the "confirm with password to link Google" ticket. */
export const OAUTH_LINK_COOKIE = "sbs_oauth_link";
export const OAUTH_COOKIE_PATH = "/api/auth/google";
export const OAUTH_TTL_SECONDS = 600;

const secure = () => process.env.NODE_ENV === "production";

export function googleConfig(
  request: Request,
): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${new URL(request.url).origin}/api/auth/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function newPkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, state: randomBytes(16).toString("hex") };
}

/** Same-site path only (never `//host`), else "". */
export function safeRedirectPath(value: string | null | undefined): string {
  return value && /^\/(?![/\\])/.test(value) ? value.slice(0, 300) : "";
}

export function setOAuthCookie(response: NextResponse, name: string, value: string): void {
  response.cookies.set(name, value, {
    httpOnly: true,
    sameSite: "lax", // the callback is a top-level GET from Google, which Lax allows
    secure: secure(),
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_TTL_SECONDS,
  });
}

export function clearOAuthCookie(response: NextResponse, name: string): void {
  response.cookies.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    path: OAUTH_COOKIE_PATH,
    maxAge: 0,
  });
}

export function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim() || null;
  }
  return null;
}

/**
 * Start a normal Salonly session: identical cookie to the one the browser sets
 * after password login (readable by the client, which sends it as a Bearer
 * token), so every protected route and the proxy treat it the same way.
 */
export function startSalonlySession(
  response: NextResponse,
  user: { id: string; role: string; salonId: string | null },
): void {
  response.cookies.set(
    AUTH_COOKIE_NAME,
    generateToken({ id: user.id, role: user.role, salonId: user.salonId }),
    {
      path: "/",
      sameSite: "lax",
      secure: secure(),
      maxAge: 60 * 60 * 24 * 7,
    },
  );
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  givenName: string | null;
  familyName: string | null;
  name: string | null;
}

/**
 * Redeem the code and validate the ID token. The token arrives straight from
 * Google's token endpoint over TLS, authenticated with our client secret and the
 * PKCE verifier, so (per OIDC Core 3.1.3.7) the claims are checked rather than
 * re-verifying a signature: issuer, audience, expiry and verified email.
 * Returns null on ANY failure; callers show a generic message.
 */
export async function redeemCode(
  cfg: { clientId: string; clientSecret: string; redirectUri: string },
  code: string,
  verifier: string,
): Promise<GoogleIdentity | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const { id_token } = (await res.json()) as { id_token?: string };
    const payload = id_token?.split(".")[1];
    if (!payload) return null;
    const c = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;

    const issuerOk = c.iss === "https://accounts.google.com" || c.iss === "accounts.google.com";
    const audOk = Array.isArray(c.aud) ? c.aud.includes(cfg.clientId) : c.aud === cfg.clientId;
    const fresh = typeof c.exp === "number" && c.exp * 1000 > Date.now();
    if (!issuerOk || !audOk || !fresh) return null;
    if (typeof c.sub !== "string" || typeof c.email !== "string") return null;
    if (c.email_verified !== true) return null;

    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    return {
      sub: c.sub,
      email: c.email.trim().toLowerCase(),
      givenName: str(c.given_name),
      familyName: str(c.family_name),
      name: str(c.name),
    };
  } catch {
    return null;
  }
}
