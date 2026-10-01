// Native Google sign-in for the Android app. Tokens are signed locally with a
// throwaway RSA key and verified against that key (injected), so nothing here
// calls Google. The route tests create throwaway users (prefixed RUN) in the
// configured database and delete them afterwards; Google's key fetch is stubbed.

import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { createSign, generateKeyPairSync } from "node:crypto";
import { NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { hashSync } from "@/lib/server/password";
import { validateToken } from "@/lib/server/jwt";
import { verifyGoogleIdToken } from "@/lib/server/googleIdToken";
import { POST as native } from "@/app/api/auth/google/native/route";

const RUN = `test-gnat-${Date.now()}`;
const AUD = "152703722367-test.apps.googleusercontent.com";
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" };
const otherKey = generateKeyPairSync("rsa", { modulusLength: 2048 });

type Claims = Record<string, unknown>;
function sign(claims: Claims, opts: { alg?: string; kid?: string; key?: typeof privateKey } = {}): string {
  const header = Buffer.from(JSON.stringify({ alg: opts.alg ?? "RS256", kid: opts.kid ?? "k1", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(opts.key ?? privateKey).toString("base64url");
  return `${header}.${payload}.${sig}`;
}
const good = (over: Claims = {}): Claims => ({
  iss: "https://accounts.google.com",
  aud: AUD,
  sub: `${RUN}-sub`,
  email: `${RUN}-a@example.test`,
  email_verified: true,
  given_name: "Gina",
  family_name: "Google",
  exp: Math.floor(Date.now() / 1000) + 600,
  ...over,
});

describe("verifyGoogleIdToken", () => {
  const opts = { audiences: [AUD], keys: [jwk] };

  test("accepts a correctly signed, current token and lowercases the email", async () => {
    const id = await verifyGoogleIdToken(sign(good({ email: "Mixed@Example.Test" })), opts);
    expect(id).toMatchObject({ email: "mixed@example.test", givenName: "Gina", familyName: "Google" });
  });

  test("rejects a bad signature, an unknown key id and a token signed by another key", async () => {
    expect(await verifyGoogleIdToken(sign(good(), { key: otherKey.privateKey }), opts)).toBeNull();
    expect(await verifyGoogleIdToken(sign(good(), { kid: "nope" }), opts)).toBeNull();
    const tampered = sign(good()).split(".");
    tampered[1] = Buffer.from(JSON.stringify(good({ email: "evil@example.test" }))).toString("base64url");
    expect(await verifyGoogleIdToken(tampered.join("."), opts)).toBeNull();
  });

  test("rejects alg none / HS256 and malformed tokens", async () => {
    expect(await verifyGoogleIdToken(sign(good(), { alg: "none" }), opts)).toBeNull();
    expect(await verifyGoogleIdToken(sign(good(), { alg: "HS256" }), opts)).toBeNull();
    for (const bad of ["", "a.b", "a.b.c", "....."]) expect(await verifyGoogleIdToken(bad, opts)).toBeNull();
  });

  test("rejects wrong audience, wrong issuer, expired, unverified email and missing claims", async () => {
    expect(await verifyGoogleIdToken(sign(good({ aud: "someone-else" })), opts)).toBeNull();
    expect(await verifyGoogleIdToken(sign(good({ iss: "https://evil.example.com" })), opts)).toBeNull();
    expect(await verifyGoogleIdToken(sign(good({ exp: Math.floor(Date.now() / 1000) - 5 })), opts)).toBeNull();
    expect(await verifyGoogleIdToken(sign(good({ email_verified: false })), opts)).toBeNull();
    expect(await verifyGoogleIdToken(sign(good({ sub: undefined })), opts)).toBeNull();
    expect(await verifyGoogleIdToken(sign(good()), { ...opts, audiences: [] })).toBeNull();
  });

  test("accepts an audience array containing ours", async () => {
    expect(await verifyGoogleIdToken(sign(good({ aud: ["x", AUD] })), opts)).not.toBeNull();
  });
});

describe("POST /api/auth/google/native", () => {
  const post = (body: unknown) =>
    native(new NextRequest(new URL("/api/auth/google/native", "http://localhost:3000"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }));

  beforeAll(() => {
    vi.stubEnv("GOOGLE_ANDROID_CLIENT_ID", AUD);
    // Serve our test key in place of Google's certs.
    vi.stubGlobal("fetch", async (url: string) =>
      String(url).includes("googleapis.com/oauth2/v3/certs")
        ? new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })
        : Promise.reject(new Error("unexpected fetch " + url)),
    );
  });
  afterEach(() => prisma.user.deleteMany({ where: { email: { startsWith: RUN } } }));
  afterAll(async () => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await prisma.$disconnect();
  });

  test("a new Google user becomes a CUSTOMER with a working session, then signs in again as the same user", async () => {
    const first = await post({ idToken: sign(good()) });
    const body = await first.json();
    expect(first.status).toBe(200);
    expect(body.user).toMatchObject({ role: "CUSTOMER", email: `${RUN}-a@example.test` });
    expect(body.user).not.toHaveProperty("password");
    expect(validateToken(body.token)?.id).toBe(body.user.id);

    const again = await (await post({ idToken: sign(good()) })).json();
    expect(again.user.id).toBe(body.user.id);
    expect(await prisma.user.count({ where: { email: { startsWith: RUN } } })).toBe(1);
  });

  test("an existing password account with the same email is not taken over", async () => {
    await prisma.user.create({ data: { firstName: "Pat", email: `${RUN}-a@example.test`, password: hashSync("pw-123456"), role: "CUSTOMER" } });
    const res = await post({ idToken: sign(good()) });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("google_account_exists");
    expect(body).not.toHaveProperty("token");
    expect((await prisma.user.findFirst({ where: { email: `${RUN}-a@example.test` } }))?.googleId).toBeNull();
  });

  test("owner, staff and admin accounts cannot use Google sign-in", async () => {
    await prisma.user.create({ data: { firstName: "Ad", email: `${RUN}-a@example.test`, password: hashSync("pw-123456"), role: "SUPER_ADMIN" } });
    const res = await post({ idToken: sign(good()) });
    expect(res.status).toBe(403);
    expect(await res.json()).not.toHaveProperty("token");
  });

  test("a disabled linked account is refused", async () => {
    await prisma.user.create({
      data: { firstName: "Off", email: `${RUN}-a@example.test`, password: hashSync("pw-123456"), role: "CUSTOMER", googleId: `${RUN}-sub`, enabled: false },
    });
    expect((await post({ idToken: sign(good()) })).status).toBe(403);
  });

  test("bad, forged and missing tokens never create anything", async () => {
    expect((await post({ idToken: sign(good(), { key: otherKey.privateKey }) })).status).toBe(401);
    expect((await post({ idToken: "garbage" })).status).toBe(401);
    expect((await post({})).status).toBe(400);
    expect((await post({ idToken: 5 })).status).toBe(400);
    expect(await prisma.user.count({ where: { email: { startsWith: RUN } } })).toBe(0);
  });

  test("503 when Google sign-in is not configured", async () => {
    vi.stubEnv("GOOGLE_ANDROID_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    expect((await post({ idToken: sign(good()) })).status).toBe(503);
    vi.stubEnv("GOOGLE_ANDROID_CLIENT_ID", AUD);
  });
});
