// Platform (SUPER_ADMIN) salon management, against the real DATABASE_URL.
// Every salon/user it creates is prefixed with RUN and removed in afterAll.

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import type { User } from "@prisma/client";

import prisma from "@/lib/server/prisma";
import { comSync, hashSync } from "@/lib/server/password";
import { generateToken } from "@/lib/server/jwt";
import { currentPlan, describePlan } from "@/lib/server/platform";

import { GET as listSalons, POST as createSalon } from "@/app/api/platform/salons/route";
import { GET as getSalon, PATCH as patchSalon } from "@/app/api/platform/salons/[id]/route";
import { POST as postPlan } from "@/app/api/platform/salons/[id]/plan/route";
import { POST as resetOwner } from "@/app/api/platform/salons/[id]/owner-password/route";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as me } from "@/app/api/auth/me/route";

const RUN = `test-plat-${Date.now()}`;
let superAdmin: User;
let superToken: string;
let ownerToken: string;
let createdId: string;

function req(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}
const idP = (id: string) => ({ params: Promise.resolve({ id }) });
const json = async (r: Response) => ({ status: r.status, body: await r.json() });

const validBody = (tag: string, plan: unknown = { planType: "MONTHLY", monthlyFee: 2500 }) => ({
  salon: {
    name: `Test Salon ${tag}`,
    slug: `${RUN}-${tag}`,
    theme: "PLAYFUL",
    accentColor: "#FF6B4A",
    tagline: "  Fresh cuts  ",
  },
  owner: { firstName: "Olive", lastName: "Owner", email: `${RUN}-${tag}@example.test` },
  plan,
});

const post = (body: unknown, token = superToken) =>
  createSalon(req("/api/platform/salons", { method: "POST", token, body })).then(json);

beforeAll(async () => {
  superAdmin = await prisma.user.create({
    data: {
      firstName: "Plat",
      email: `${RUN}-super@example.test`,
      password: hashSync("x-long-password-1"),
      role: "SUPER_ADMIN",
    },
  });
  superToken = generateToken({ id: superAdmin.id, role: "SUPER_ADMIN" });
});

afterAll(async () => {
  const salons = await prisma.salon.findMany({ where: { slug: { startsWith: RUN } }, select: { id: true } });
  for (const { id } of salons) await prisma.salon.delete({ where: { id } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
  await prisma.$disconnect();
});

describe("creating a salon", () => {
  test("creates salon, settings, hours, plan and an OWNER who can sign in with the temp password", async () => {
    const res = await post(validBody("a"));
    expect(res.status).toBe(201);
    const { salon, credentials } = res.body;
    createdId = salon.id;

    expect(salon.theme).toBe("PLAYFUL");
    expect(salon.accentColor).toBe("#ff6b4a");
    expect(salon.tagline).toBe("Fresh cuts");
    expect(salon.billingPlans).toHaveLength(1);
    expect(salon.billingPlans[0].planType).toBe("MONTHLY");
    expect(Number(salon.billingPlans[0].monthlyFee)).toBe(2500);

    const [settings, hours, owner] = await Promise.all([
      prisma.salonSettings.findUnique({ where: { salonId: salon.id } }),
      prisma.salonOpeningHour.count({ where: { salonId: salon.id } }),
      prisma.user.findUnique({ where: { email: credentials.email } }),
    ]);
    expect(settings).not.toBeNull();
    expect(hours).toBe(7);
    expect(owner?.role).toBe("OWNER");
    expect(owner?.salonId).toBe(salon.id);
    expect(owner?.password).not.toBe(credentials.temporaryPassword);
    expect(comSync(credentials.temporaryPassword, owner!.password)).toBe(true);

    const signIn = await json(
      await login(
        req("/api/auth/login", {
          method: "POST",
          body: { email: credentials.email, password: credentials.temporaryPassword },
        }),
      ),
    );
    expect(signIn.status).toBe(200);
    expect(signIn.body.user.salonSlug).toBe(`${RUN}-a`);
    ownerToken = signIn.body.token;
  });

  test("a taken slug or owner email is a 409 and nothing is half-created", async () => {
    const dupSlug = await post({ ...validBody("a"), owner: { firstName: "X", email: `${RUN}-other@example.test` } });
    expect(dupSlug.status).toBe(409);
    expect(dupSlug.body.message).toContain("already taken");

    const dupEmail = await post({ ...validBody("b"), owner: { firstName: "X", email: `${RUN}-a@example.test` } });
    expect(dupEmail.status).toBe(409);
    expect(dupEmail.body.message).toContain("already exists");
    expect(await prisma.salon.count({ where: { slug: `${RUN}-b` } })).toBe(0);
  });

  test("invalid plans and fields are rejected with field errors", async () => {
    const bad = [
      { planType: "COMMISSION", commissionType: "PERCENT", commissionValue: 120 },
      { planType: "COMMISSION", commissionType: "PERCENT", commissionValue: 0 },
      { planType: "COMMISSION", commissionType: "FLAT" },
      { planType: "MONTHLY", monthlyFee: -5 },
      { planType: "MONTHLY", monthlyFee: 10.555 },
    ];
    for (const plan of bad) {
      expect((await post(validBody("c", plan))).status).toBe(400);
    }
    const body = validBody("d");
    const badSlug = await post({ ...body, salon: { ...body.salon, slug: "Bad Slug!" } });
    expect(badSlug.status).toBe(400);
    expect(badSlug.body.fieldErrors["salon.slug"]).toBeTruthy();
  });

  test("commission plans (percent and flat) are accepted", async () => {
    const pct = await post(validBody("pct", { planType: "COMMISSION", commissionType: "PERCENT", commissionValue: 12.5 }));
    expect(pct.status).toBe(201);
    expect(pct.body.salon.billingPlans[0].commissionType).toBe("PERCENT");
    const flat = await post(validBody("flat", { planType: "COMMISSION", commissionType: "FLAT", commissionValue: 50 }));
    expect(flat.status).toBe(201);
    expect(flat.body.salon.billingPlans[0].commissionType).toBe("FLAT");
  });
});

describe("access control", () => {
  test("salon owners and anonymous callers cannot use platform routes", async () => {
    expect((await listSalons(req("/api/platform/salons"))).status).toBe(401);
    expect((await listSalons(req("/api/platform/salons", { token: ownerToken }))).status).toBe(403);
    expect((await post(validBody("z"), ownerToken)).status).toBe(403);
  });
});

describe("managing a salon", () => {
  test("list and detail include owner, current plan summary and counts", async () => {
    const list = await json(await listSalons(req("/api/platform/salons", { token: superToken })));
    const row = list.body.salons.find((s: { id: string }) => s.id === createdId);
    expect(row.owner.email).toBe(`${RUN}-a@example.test`);
    expect(row.plan.summary).toBe("₹2,500 / month");

    const detail = await json(await getSalon(req(`/api/platform/salons/${createdId}`, { token: superToken }), idP(createdId)));
    expect(detail.body.salon.team).toHaveLength(1);
    expect(detail.body.salon.plans[0].status).toBe("CURRENT");
  });

  test("changing the plan adds a version; history is kept", async () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    const res = await json(
      await postPlan(
        req(`/api/platform/salons/${createdId}/plan`, {
          method: "POST",
          token: superToken,
          body: { plan: { planType: "COMMISSION", commissionType: "PERCENT", commissionValue: 10 }, effectiveFrom: future },
        }),
        idP(createdId),
      ),
    );
    expect(res.status).toBe(201);
    const detail = await json(await getSalon(req(`/api/platform/salons/${createdId}`, { token: superToken }), idP(createdId)));
    expect(detail.body.salon.plans.map((p: { status: string }) => p.status)).toEqual(["SCHEDULED", "CURRENT"]);
  });

  test("deactivating locks the owner out; reactivating restores access", async () => {
    const patch = (isActive: boolean) =>
      patchSalon(
        req(`/api/platform/salons/${createdId}`, { method: "PATCH", token: superToken, body: { isActive } }),
        idP(createdId),
      );
    expect((await patch(false)).status).toBe(200);
    expect((await me(req("/api/auth/me", { token: ownerToken }))).status).toBe(401);
    await patch(true);
    expect((await me(req("/api/auth/me", { token: ownerToken }))).status).toBe(200);
  });

  test("theme can be changed; a taken slug is refused", async () => {
    const ok = await json(
      await patchSalon(
        req(`/api/platform/salons/${createdId}`, { method: "PATCH", token: superToken, body: { theme: "LUXE" } }),
        idP(createdId),
      ),
    );
    expect(ok.body.salon.theme).toBe("LUXE");
    const clash = await patchSalon(
      req(`/api/platform/salons/${createdId}`, { method: "PATCH", token: superToken, body: { slug: `${RUN}-pct` } }),
      idP(createdId),
    );
    expect(clash.status).toBe(409);
  });

  test("owner password reset issues a new working password", async () => {
    const res = await json(
      await resetOwner(req(`/api/platform/salons/${createdId}/owner-password`, { method: "POST", token: superToken }), idP(createdId)),
    );
    expect(res.status).toBe(200);
    const signIn = await login(
      req("/api/auth/login", {
        method: "POST",
        body: { email: res.body.credentials.email, password: res.body.credentials.temporaryPassword },
      }),
    );
    expect(signIn.status).toBe(200);
  });
});

describe("plan helpers", () => {
  test("currentPlan picks the latest plan already in force; describePlan formats each kind", () => {
    const d = (s: string) => new Date(s);
    const plans = [{ effectiveFrom: d("2026-01-01") }, { effectiveFrom: d("2026-06-01") }, { effectiveFrom: d("2027-01-01") }];
    expect(currentPlan(plans, d("2026-07-01"))).toBe(plans[1]);
    expect(currentPlan(plans, d("2025-01-01"))).toBeNull();
    expect(describePlan({ planType: "COMMISSION", monthlyFee: null, commissionType: "PERCENT", commissionValue: 12.5 })).toBe(
      "12.5% of completed bookings",
    );
    expect(describePlan({ planType: "COMMISSION", monthlyFee: null, commissionType: "FLAT", commissionValue: 50 })).toBe(
      "₹50 per completed booking",
    );
  });
});
