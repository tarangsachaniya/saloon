import "server-only";

import { createPublicKey, verify as cryptoVerify, type JsonWebKey } from "node:crypto";

/**
 * Verification of a Google ID token (a signed JWT) sent by the Android app after
 * native Google sign-in. Unlike the browser flow, the token does not come to us
 * straight from Google's token endpoint, so the SIGNATURE must be checked:
 * RS256 against Google's published keys, then issuer, audience, expiry and a
 * verified email.
 *
 * Accepted audiences come from env: GOOGLE_ANDROID_CLIENT_ID (the app's Android
 * OAuth client; comma-separated for several) and, optionally, GOOGLE_CLIENT_ID.
 */

export const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export interface GoogleIdentity {
  sub: string;
  email: string;
  givenName: string | null;
  familyName: string | null;
  name: string | null;
}

type Jwk = JsonWebKey & { kid?: string };

let cache: { keys: Jwk[]; expires: number } | null = null;

/** Google's signing keys, cached for an hour (they rotate roughly daily). */
async function fetchGoogleKeys(): Promise<Jwk[]> {
  if (cache && cache.expires > Date.now()) return cache.keys;
  const res = await fetch(GOOGLE_CERTS_URL, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!res.ok) throw new Error("google certs unavailable");
  const { keys } = (await res.json()) as { keys?: Jwk[] };
  if (!Array.isArray(keys)) throw new Error("google certs malformed");
  cache = { keys, expires: Date.now() + 60 * 60 * 1000 };
  return keys;
}

export function allowedAudiences(): string[] {
  return [process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_CLIENT_ID]
    .flatMap((v) => (v ?? "").split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

const b64 = (s: string) => Buffer.from(s, "base64url");

/**
 * Returns the verified identity, or null for ANY problem (callers show a generic
 * message). `keys` can be injected for tests; otherwise Google's keys are fetched.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  options: { audiences?: string[]; keys?: Jwk[]; now?: number } = {},
): Promise<GoogleIdentity | null> {
  try {
    const audiences = options.audiences ?? allowedAudiences();
    if (audiences.length === 0) return null;

    const parts = idToken.split(".");
    if (parts.length !== 3 || parts.some((p) => !p)) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(b64(headerB64).toString("utf8")) as { alg?: string; kid?: string };
    if (header.alg !== "RS256" || !header.kid) return null; // never accept "none" or HMAC

    const keys = options.keys ?? (await fetchGoogleKeys());
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const valid = cryptoVerify(
      "RSA-SHA256",
      Buffer.from(`${headerB64}.${payloadB64}`),
      createPublicKey({ key: jwk, format: "jwk" }),
      b64(signatureB64),
    );
    if (!valid) return null;

    const c = JSON.parse(b64(payloadB64).toString("utf8")) as Record<string, unknown>;
    const now = options.now ?? Date.now();
    const issuerOk = c.iss === "https://accounts.google.com" || c.iss === "accounts.google.com";
    const audOk = Array.isArray(c.aud) ? c.aud.some((a) => audiences.includes(String(a))) : audiences.includes(String(c.aud));
    const fresh = typeof c.exp === "number" && c.exp * 1000 > now;
    if (!issuerOk || !audOk || !fresh) return null;
    if (typeof c.sub !== "string" || typeof c.email !== "string" || c.email_verified !== true) return null;

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
