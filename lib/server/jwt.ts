import "server-only";

import jwt, { type JwtPayload } from "jsonwebtoken";

/**
 * Port of `backend/util/jwtToken.js`.
 *
 * Same secret (`JWT_SECRET`) and the same lifetimes (30d for a session token,
 * 1h for a password-reset token), so tokens issued by the old Express backend
 * are still accepted here and vice versa.
 *
 * Next.js loads `.env` / `.env.local` itself — there is no dotenv call, unlike
 * the Express app's `config.js`.
 */

const secret = process.env.JWT_SECRET;

function requireSecret(): string {
  if (!secret) {
    // Failing loudly beats silently signing with `undefined`, which
    // jsonwebtoken would reject at verify time in a much more confusing way.
    throw new Error("JWT_SECRET is not set. Add it to .env before starting the app.");
  }
  return secret;
}

export function generateToken(user: object): string {
  return jwt.sign(user as JwtPayload, requireSecret(), { expiresIn: "30d" });
}

export function validateToken(token: string): (JwtPayload & { id?: string }) | null {
  try {
    const decoded = jwt.verify(token, requireSecret());
    return typeof decoded === "string" ? null : (decoded as JwtPayload & { id?: string });
  } catch {
    return null;
  }
}

export function generateTokenForForgot(user: object): string {
  return jwt.sign(user as JwtPayload, requireSecret(), { expiresIn: "1h" });
}
