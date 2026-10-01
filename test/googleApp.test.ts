// Google sign-in handoff for the Android app. No call goes to Google: the start
// route is exercised with GOOGLE_* unset/dummy (it only builds a redirect), and
// the exchange route is driven with tickets signed locally, exactly as the
// callback signs them. The exchange test creates one throwaway CUSTOMER row
// (prefixed with RUN) in the configured database and removes it afterwards.

import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { hashSync } from "@/lib/server/password";
import { signPurposeToken, validateToken } from "@/lib/server/jwt";
import { APP_TICKET_PURPOSE, appRedirect, challengeOf, isAppChallenge } from "@/lib/server/googleOAuth";

import { GET as start } from "@/app/api/auth/google/start/route";
import { POST as exchange } from "@/app/api/auth/google/exchange/route";

const RUN = `test-gapp-${Date.now()}`;
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");

let customerId: string;
let ownerLikeId: string;

const post = (body: unknown) =>
  new NextRequest(new URL("/api/auth/google/exchange", "http://localhost:3000"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const ticketFor = (userId: string, ch = challenge, ttl = 120) => signPurposeToken(APP_TICKET_PURPOSE, { userId, challenge: ch }, ttl);

beforeAll(async () => {
  const customer = await prisma.user.create({
    data: { firstName: "Gee", email: `${RUN}-c@example.test`, password: hashSync("irrelevant-1"), role: "CUSTOMER" },
  });
  const staffish = await prisma.user.create({
    data: { firstName: "Not", email: `${RUN}-s@example.test`, password: hashSync("irrelevant-1"), role: "SUPER_ADMIN" },
  });
  customerId = customer.id;
  ownerLikeId = staffish.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
  await prisma.$disconnect();
});

describe("challenge helpers", () => {
  test("challengeOf is base64url sha256 and is a valid challenge", () => {
    expect(challengeOf(verifier)).toBe(challenge);
    expect(isAppChallenge(challenge)).toBe(true);
  });
  test("rejects malformed challenges", () => {
    for (const bad of [null, undefined, "", "short", `${challenge}x`, `${challenge.slice(0, 42)}+`, `${challenge.slice(0, 42)} `]) {
      expect(isAppChallenge(bad as string | null | undefined)).toBe(false);
    }
  });
});

describe("appRedirect", () => {
  test("redirects to the app scheme with the given params", () => {
    const res = appRedirect({ error: "google_failed" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("salonbook://auth?error=google_failed");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("GET /api/auth/google/start for the app", () => {
  const url = (qs: string) => new Request(`http://localhost:3000/api/auth/google/start?${qs}`);

  test("a missing or malformed challenge goes straight back to the app with an error", async () => {
    for (const qs of ["client=app", "client=app&challenge=nope"]) {
      const res = await start(url(qs));
      expect(res.headers.get("location")).toBe("salonbook://auth?error=google_failed");
    }
  });

  test("without Google credentials the app is told it is unavailable", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    const res = await start(url(`client=app&challenge=${challenge}`));
    expect(res.headers.get("location")).toBe("salonbook://auth?error=google_unavailable");
    vi.unstubAllEnvs();
  });

  test("with credentials it redirects to Google and stores the app challenge in the signed state cookie", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "dummy-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "dummy-secret");
    const res = await start(url(`client=app&challenge=${challenge}`));
    const location = new URL(res.headers.get("location")!);
    expect(location.host).toBe("accounts.google.com");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");

    const cookie = res.cookies.get("sbs_oauth")?.value;
    const state = validateToken(cookie!) as { client?: string; appChallenge?: string; purpose?: string } | null;
    expect(state?.purpose).toBe("google-oauth");
    expect(state?.client).toBe("app");
    expect(state?.appChallenge).toBe(challenge);
    vi.unstubAllEnvs();
  });

  test("the web flow is unchanged: no app markers in the state cookie", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "dummy-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "dummy-secret");
    const res = await start(url(""));
    const state = validateToken(res.cookies.get("sbs_oauth")!.value) as { client?: string } | null;
    expect(state?.client).toBeUndefined();
    vi.unstubAllEnvs();
  });
});

describe("POST /api/auth/google/exchange", () => {
  test("a valid ticket plus the matching verifier returns a session for the customer", async () => {
    const res = await exchange(post({ ticket: ticketFor(customerId), verifier }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user).toMatchObject({ id: customerId, role: "CUSTOMER" });
    expect(body.user).not.toHaveProperty("password");
    const claims = validateToken(body.token);
    expect(claims?.id).toBe(customerId);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  test("the wrong verifier cannot redeem the ticket (intercepted-link attack)", async () => {
    const attacker = randomBytes(32).toString("base64url");
    const res = await exchange(post({ ticket: ticketFor(customerId), verifier: attacker }));
    expect(res.status).toBe(401);
    expect(await res.json()).not.toHaveProperty("token");
  });

  test("an expired ticket is refused", async () => {
    const expired = signPurposeToken(APP_TICKET_PURPOSE, { userId: customerId, challenge }, -10);
    expect((await exchange(post({ ticket: expired, verifier }))).status).toBe(401);
  });

  test("a token with another purpose (e.g. the OAuth state cookie or a session) is not a ticket", async () => {
    const wrong = signPurposeToken("google-oauth", { userId: customerId, challenge }, 120);
    expect((await exchange(post({ ticket: wrong, verifier }))).status).toBe(401);
    expect((await exchange(post({ ticket: "not-a-jwt", verifier }))).status).toBe(401);
  });

  test("missing or short inputs are 400", async () => {
    expect((await exchange(post({}))).status).toBe(400);
    expect((await exchange(post({ ticket: ticketFor(customerId), verifier: "short" }))).status).toBe(400);
    expect((await exchange(post({ ticket: 5, verifier }))).status).toBe(400);
  });

  test("only customers can use Google sign-in; other roles are refused", async () => {
    const res = await exchange(post({ ticket: ticketFor(ownerLikeId), verifier }));
    expect(res.status).toBe(403);
    expect(await res.json()).not.toHaveProperty("token");
  });

  test("a disabled or deleted account is refused", async () => {
    await prisma.user.update({ where: { id: customerId }, data: { enabled: false } });
    expect((await exchange(post({ ticket: ticketFor(customerId), verifier }))).status).toBe(403);
    await prisma.user.update({ where: { id: customerId }, data: { enabled: true } });
    expect((await exchange(post({ ticket: ticketFor("00000000-0000-4000-8000-000000000000"), verifier }))).status).toBe(403);
  });
});
