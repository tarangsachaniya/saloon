import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238: HMAC-SHA1, 6 digits, 30s step) on Node's `crypto`, so
 * authenticator apps (Google Authenticator, Authy, 1Password...) interoperate
 * without a dependency. Also seals the secret at rest.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of input.replace(/=+$/, "").toUpperCase()) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Invalid base32 secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** 160-bit random secret, base32 (what authenticator apps expect). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return code.toString().padStart(DIGITS, "0");
}

/** Accepts the current step and one either side, to tolerate clock drift. */
export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const step = Math.floor(now / 1000 / STEP_SECONDS);
  let ok = false;
  for (const drift of [-1, 0, 1]) {
    const expected = Buffer.from(hotp(secret, step + drift));
    if (timingSafeEqual(expected, Buffer.from(code))) ok = true;
  }
  return ok;
}

export function otpauthUri(secret: string, email: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/* ------------------------------ at-rest sealing ---------------------------- */

function key(): Buffer {
  const material = process.env.TWO_FACTOR_KEY || process.env.JWT_SECRET;
  if (!material) throw new Error("JWT_SECRET (or TWO_FACTOR_KEY) is not set.");
  return createHash("sha256").update(`salonly:2fa:${material}`).digest();
}

/** AES-256-GCM: `v1.<iv>.<tag>.<ciphertext>` (base64url). */
export function sealSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function openSecret(sealed: string): string | null {
  try {
    const [version, iv, tag, data] = sealed.split(".");
    if (version !== "v1") return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
