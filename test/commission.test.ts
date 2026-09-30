// Integration tests for worker commission, against the real Postgres in
// DATABASE_URL. Everything is created under throwaway `test-com-` salons/users
// and removed by exact id in afterAll; real data is never touched.

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/server/prisma";
import { hashSync } from "@/lib/server/password";
import { generateToken } from "@/lib/server/jwt";
import { parseDateOnly, toDateString } from "@/lib/server/availability";
import { calcCommission, isValidPercentage } from "@/lib/server/commissions";
import { makeCustomer } from "./customerToken";

import { PATCH as patchAppointment } from "@/app/api/dashboard/appointments/[id]/route";
import { PATCH as patchCommission } from "@/app/api/dashboard/barbers/[id]/commission/route";
import { GET as listCommissions } from "@/app/api/dashboard/commissions/route";
import { GET as commissionSummary } from "@/app/api/dashboard/commissions/summary/route";
import { POST as payCommission } from "@/app/api/dashboard/commissions/[id]/pay/route";
import { GET as dashboardBarbers } from "@/app/api/dashboard/barbers/route";
import { GET as publicBarbers } from "@/app/api/s/[slug]/barbers/route";
import { POST as bookAppointment } from "@/app/api/s/[slug]/appointments/route";

const RUN = `test-com-${Date.now()}`;
const ORIGIN = "http://localhost:3000";

type Tenant = { salonId: string; slug: string; token: string; staffToken: string; barberId: string; serviceId: string; clientId: string };
const salonIds: string[] = [];
const userIds: string[] = [];
let A: Tenant;
let B: Tenant;
let customer: { id: string; token: string };
let day: string;

function req(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  return new NextRequest(new URL(path, ORIGIN), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}
const idP = (id: string) => ({ params: Promise.resolve({ id }) });
const slugP = (slug: string) => ({ params: Promise.resolve({ slug }) });
const json = async (r: Response) => ({ status: r.status, body: await r.json() });

async function tenant(tag: string): Promise<Tenant> {
  const salon = await prisma.salon.create({
    data: {
      slug: `${RUN}-${tag}`,
      name: `${RUN} ${tag}`,
      settings: { create: {} },
      openingHours: { create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, isOpen: true, openTime: 540, closeTime: 1260 })) },
    },
  });
  salonIds.push(salon.id);
  const service = await prisma.service.create({ data: { salonId: salon.id, name: `${tag}-svc`, price: 500, durationMinutes: 30 } });
  const barber = await prisma.barber.create({
    data: {
      salonId: salon.id,
      name: `${tag}-barber`,
      commissionPercentage: 40,
      services: { connect: { id: service.id } },
      workingHours: { create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: 540, endTime: 1260 })) },
    },
  });
  const mk = async (role: "OWNER" | "STAFF") => {
    const u = await prisma.user.create({
      data: { firstName: tag, email: `${RUN}-${tag}-${role}@example.test`, password: hashSync("Pass12345!"), role, salonId: salon.id },
    });
    userIds.push(u.id);
    return generateToken({ id: u.id, role: u.role });
  };
  const client = await prisma.client.create({ data: { salonId: salon.id, name: `${tag}-client`, phone: `t${tag}${Date.now()}`.slice(0, 18) } });
  return { salonId: salon.id, slug: salon.slug, token: await mk("OWNER"), staffToken: await mk("STAFF"), barberId: barber.id, serviceId: service.id, clientId: client.id };
}

let slot = 600;
async function appointment(t: Tenant, price: number, status: "CONFIRMED" | "CANCELLED" | "NO_SHOW" = "CONFIRMED") {
  slot += 45;
  return prisma.appointment.create({
    data: {
      salonId: t.salonId, clientId: t.clientId, barberId: t.barberId, serviceId: t.serviceId,
      appointmentDate: parseDateOnly(day), startTime: slot, endTime: slot + 30, durationMinutes: 30, price, status,
    },
  });
}
const setStatus = (t: Tenant, id: string, status: string, token = t.token) =>
  patchAppointment(req(`/api/dashboard/appointments/${id}`, { method: "PATCH", body: { status }, token }), idP(id)).then(json);
const setPct = (t: Tenant, value: unknown, token = t.token, barberId = t.barberId) =>
  patchCommission(req(`/api/dashboard/barbers/${barberId}/commission`, { method: "PATCH", body: { commissionPercentage: value }, token }), idP(barberId)).then(json);
const rowFor = (appointmentId: string) => prisma.workerCommission.findMany({ where: { appointmentId } });

beforeAll(async () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  day = toDateString(d);
  customer = await makeCustomer(RUN);
  userIds.push(customer.id);
  A = await tenant("a");
  B = await tenant("b");
});

afterAll(async () => {
  await prisma.workerCommission.deleteMany({ where: { salonId: { in: salonIds } } });
  await prisma.appointment.deleteMany({ where: { salonId: { in: salonIds } } });
  await prisma.client.deleteMany({ where: { salonId: { in: salonIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.barber.deleteMany({ where: { salonId: { in: salonIds } } });
  await prisma.service.deleteMany({ where: { salonId: { in: salonIds } } });
  await prisma.salon.deleteMany({ where: { id: { in: salonIds } } });
  await prisma.$disconnect();
});

describe("commission maths and validation", () => {
  test("exact decimal maths, half-up to 2dp", () => {
    expect(calcCommission(500, 40).toString()).toBe("200");
    expect(calcCommission(800, 25).toString()).toBe("200");
    expect(calcCommission(800, 35).toString()).toBe("280");
    expect(calcCommission(500, 0).toString()).toBe("0");
    expect(calcCommission(500, 100).toString()).toBe("500");
    expect(calcCommission("99.99", "40.5").toString()).toBe("40.5"); // 40.49595 -> 40.50
    expect(calcCommission(0.1, 3).toString()).toBe("0"); // 0.003 -> 0.00
    expect(calcCommission(new Prisma.Decimal("1.05"), 50).toString()).toBe("0.53"); // 0.525 half-up
  });

  test("percentage validation", () => {
    for (const ok of [0, 20, 35, 40.5, 100, 12.25]) expect(isValidPercentage(ok)).toBe(true);
    for (const bad of [-5, -0.01, 101, 100.01, NaN, Infinity, "40", null, undefined, "abc", 12.345, {}, [], true]) expect(isValidPercentage(bad)).toBe(false);
  });
});

describe("configuring the percentage", () => {
  test("owner can set valid values incl. decimals, 0 and 100", async () => {
    for (const v of [35, 40.5, 0, 100, 40]) {
      const r = await setPct(A, v);
      expect(r.status).toBe(200);
      expect(r.body.barber.commissionPercentage).toBe(v);
    }
  });

  test("server rejects invalid values, DB unchanged", async () => {
    for (const v of [-10, 110, "abc", "40", null, NaN, 12.345]) {
      expect((await setPct(A, v)).status).toBe(400);
    }
    expect((await prisma.barber.findUniqueOrThrow({ where: { id: A.barberId }, select: { commissionPercentage: true } })).commissionPercentage.toString()).toBe("40");
  });

  test("staff, customers and anonymous callers are refused", async () => {
    expect((await setPct(A, 10, A.staffToken)).status).toBe(403);
    expect((await setPct(A, 10, customer.token)).status).toBe(401);
    expect((await setPct(A, 10, "")).status).toBe(401);
    expect((await setPct(A, 10, "junk.token.x")).status).toBe(401);
  });

  test("salon A cannot configure salon B's worker", async () => {
    const r = await setPct(A, 5, A.token, B.barberId);
    expect(r.status).toBe(404);
    expect(Number((await prisma.barber.findUniqueOrThrow({ where: { id: B.barberId }, select: { commissionPercentage: true } })).commissionPercentage)).toBe(40);
  });
});

describe("generation on COMPLETED", () => {
  test("scenario 1 & 7: 40% of 500 = 200, exactly one row, snapshot stored, PENDING", async () => {
    await setPct(A, 40);
    const a = await appointment(A, 500);
    expect(await rowFor(a.id)).toHaveLength(0); // not at booking
    expect((await setStatus(A, a.id, "CONFIRMED")).status).toBe(200);
    expect(await rowFor(a.id)).toHaveLength(0); // not before completion
    expect((await setStatus(A, a.id, "COMPLETED")).status).toBe(200);
    const rows = await rowFor(a.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "PENDING", paidAt: null, barberId: A.barberId, salonId: A.salonId });
    expect(rows[0].commissionPercentage.toString()).toBe("40");
    expect(rows[0].serviceAmount.toString()).toBe("500");
    expect(rows[0].commissionAmount.toString()).toBe("200");
  });

  test("scenario 2: 25% of 800 = 200", async () => {
    await setPct(A, 25);
    const a = await appointment(A, 800);
    await setStatus(A, a.id, "COMPLETED");
    expect((await rowFor(a.id))[0].commissionAmount.toString()).toBe("200");
  });

  test("scenarios 3 & 4: 0% -> 0, 100% -> full amount", async () => {
    await setPct(A, 0);
    const z = await appointment(A, 500);
    await setStatus(A, z.id, "COMPLETED");
    expect((await rowFor(z.id))[0].commissionAmount.toString()).toBe("0");
    await setPct(A, 100);
    const f = await appointment(A, 500);
    await setStatus(A, f.id, "COMPLETED");
    expect((await rowFor(f.id))[0].commissionAmount.toString()).toBe("500");
  });

  test("scenarios 5 & 6: cancelled and no-show never produce commission", async () => {
    const c = await appointment(A, 500);
    await setStatus(A, c.id, "CANCELLED");
    const n = await appointment(A, 500);
    await setStatus(A, n.id, "NO_SHOW");
    expect(await rowFor(c.id)).toHaveLength(0);
    expect(await rowFor(n.id)).toHaveLength(0);
    // and a cancelled appointment cannot be completed afterwards
    expect((await setStatus(A, c.id, "COMPLETED")).status).toBe(400);
    expect(await rowFor(c.id)).toHaveLength(0);
  });

  test("scenario 8: completing twice / concurrently still leaves ONE row", async () => {
    await setPct(A, 40);
    const a = await appointment(A, 500);
    const results = await Promise.all([setStatus(A, a.id, "COMPLETED"), setStatus(A, a.id, "COMPLETED"), setStatus(A, a.id, "COMPLETED")]);
    expect(results.every((r) => r.status === 200 || r.status === 400)).toBe(true);
    expect(await rowFor(a.id)).toHaveLength(1);
    expect((await setStatus(A, a.id, "COMPLETED")).status).toBe(200); // same status = no-op
    expect(await rowFor(a.id)).toHaveLength(1);
  });

  test("DB refuses a second row for the same appointment", async () => {
    const a = await appointment(A, 500);
    await setStatus(A, a.id, "COMPLETED");
    await expect(
      prisma.workerCommission.create({
        data: { appointmentId: a.id, barberId: A.barberId, salonId: A.salonId, commissionPercentage: 1, serviceAmount: 1, commissionAmount: 0.01 },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  test("scenario 9: history keeps the percentage used at completion (30 -> 40)", async () => {
    await setPct(A, 30);
    const old = await appointment(A, 500);
    await setStatus(A, old.id, "COMPLETED");
    await setPct(A, 40);
    const fresh = await appointment(A, 500);
    await setStatus(A, fresh.id, "COMPLETED");
    // service price changes later must not rewrite it either
    await prisma.service.update({ where: { id: A.serviceId }, data: { price: 999 } });
    const [o] = await rowFor(old.id);
    const [n] = await rowFor(fresh.id);
    expect([o.commissionPercentage.toString(), o.commissionAmount.toString()]).toEqual(["30", "150"]);
    expect([n.commissionPercentage.toString(), n.commissionAmount.toString()]).toEqual(["40", "200"]);
    await prisma.service.update({ where: { id: A.serviceId }, data: { price: 500 } });
  });

  test("a failing commission rolls the status change back (never COMPLETED without a row)", async () => {
    const a = await appointment(A, 500);
    // make the worker "not in this salon" so commission creation must fail
    const stray = await prisma.barber.create({ data: { salonId: B.salonId, name: "stray" } });
    await prisma.appointment.update({ where: { id: a.id }, data: { barberId: stray.id } }).catch(() => {});
    const res = await setStatus(A, a.id, "COMPLETED");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(res.body)).not.toMatch(/prisma|barber_|SELECT|stack/i);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: a.id } })).status).not.toBe("COMPLETED");
    expect(await rowFor(a.id)).toHaveLength(0);
    await prisma.appointment.update({ where: { id: a.id }, data: { barberId: A.barberId } });
    await prisma.barber.delete({ where: { id: stray.id } });
  });
});

describe("earnings, history and payment", () => {
  test("summary totals come from stored rows", async () => {
    const r = await commissionSummary(req("/api/dashboard/commissions/summary", { token: A.token })).then(json);
    expect(r.status).toBe(200);
    const w = r.body.workers.find((x: { id: string }) => x.id === A.barberId);
    const rows = await prisma.workerCommission.findMany({ where: { barberId: A.barberId } });
    const total = rows.reduce((t, x) => t + Number(x.commissionAmount), 0);
    expect(w.completedServices).toBe(rows.length);
    expect(w.totalCommission).toBeCloseTo(total, 2);
    expect(w.pendingCommission).toBeCloseTo(total, 2);
    expect(w.paidCommission).toBe(0);
    expect(w.commissionPercentage).toBe(40);
  });

  test("date filter applies to the appointment date", async () => {
    const inside = await commissionSummary(req(`/api/dashboard/commissions/summary?from=${day}&to=${day}`, { token: A.token })).then(json);
    const outside = await commissionSummary(req("/api/dashboard/commissions/summary?from=2020-01-01&to=2020-01-31", { token: A.token })).then(json);
    expect(inside.body.workers.find((x: { id: string }) => x.id === A.barberId).completedServices).toBeGreaterThan(0);
    expect(outside.body.workers.find((x: { id: string }) => x.id === A.barberId).completedServices).toBe(0);
    expect((await commissionSummary(req("/api/dashboard/commissions/summary?from=bad", { token: A.token })).then(json)).status).toBe(400);
  });

  test("history lists real service names/dates; mark paid is once-only", async () => {
    const h = await listCommissions(req(`/api/dashboard/commissions?barberId=${A.barberId}`, { token: A.token })).then(json);
    expect(h.status).toBe(200);
    expect(h.body.commissions.length).toBeGreaterThan(0);
    expect(h.body.commissions[0]).toMatchObject({ serviceName: "a-svc", date: day, status: "PENDING" });
    const id = h.body.commissions[0].id;
    const paid = await payCommission(req(`/api/dashboard/commissions/${id}/pay`, { method: "POST", token: A.token }), idP(id)).then(json);
    expect(paid.status).toBe(200);
    expect(paid.body.commission.status).toBe("PAID");
    expect(paid.body.commission.paidAt).toBeTruthy();
    const again = await payCommission(req(`/api/dashboard/commissions/${id}/pay`, { method: "POST", token: A.token }), idP(id)).then(json);
    expect(again.status).toBe(409);
    const sum = await commissionSummary(req("/api/dashboard/commissions/summary", { token: A.token })).then(json);
    expect(sum.body.workers.find((x: { id: string }) => x.id === A.barberId).paidCommission).toBeGreaterThan(0);
  });
});

describe("isolation and secrecy", () => {
  test("salon B sees none of A's commission data and cannot pay A's records", async () => {
    const bAppt = await appointment(B, 500);
    await setStatus(B, bAppt.id, "COMPLETED");
    const bList = await listCommissions(req("/api/dashboard/commissions", { token: B.token })).then(json);
    expect(bList.body.commissions.every((c: { barberId: string }) => c.barberId === B.barberId)).toBe(true);
    const aRow = await prisma.workerCommission.findFirstOrThrow({ where: { salonId: A.salonId, status: "PENDING" } });
    expect((await payCommission(req(`/api/dashboard/commissions/${aRow.id}/pay`, { method: "POST", token: B.token }), idP(aRow.id)).then(json)).status).toBe(404);
    expect((await prisma.workerCommission.findUniqueOrThrow({ where: { id: aRow.id } })).status).toBe("PENDING");
    expect((await listCommissions(req(`/api/dashboard/commissions?barberId=${A.barberId}`, { token: B.token })).then(json)).status).toBe(404);
    const sum = await commissionSummary(req("/api/dashboard/commissions/summary", { token: B.token })).then(json);
    expect(sum.body.workers.map((w: { id: string }) => w.id)).toEqual([B.barberId]);
  });

  test("staff and customers cannot read or pay commission data", async () => {
    const aRow = await prisma.workerCommission.findFirstOrThrow({ where: { salonId: A.salonId, status: "PENDING" } });
    for (const token of [A.staffToken, customer.token, ""]) {
      expect((await commissionSummary(req("/api/dashboard/commissions/summary", { token })).then(json)).status).toBeGreaterThanOrEqual(401);
      expect((await listCommissions(req("/api/dashboard/commissions", { token })).then(json)).status).toBeGreaterThanOrEqual(401);
      expect((await payCommission(req(`/api/dashboard/commissions/${aRow.id}/pay`, { method: "POST", token }), idP(aRow.id)).then(json)).status).toBeGreaterThanOrEqual(401);
    }
  });

  test("commission % never appears in public, staff or customer-facing responses", async () => {
    const pub = await publicBarbers(req(`/api/s/${A.slug}/barbers`), slugP(A.slug)).then(json);
    expect(JSON.stringify(pub.body)).not.toMatch(/commission/i);
    const staff = await dashboardBarbers(req("/api/dashboard/barbers", { token: A.staffToken })).then(json);
    expect(JSON.stringify(staff.body)).not.toMatch(/commission/i);
    const owner = await dashboardBarbers(req("/api/dashboard/barbers", { token: A.token })).then(json);
    expect(owner.body.barbers[0].commissionPercentage).toBeDefined(); // owner opt-in works
    // a customer's booking response embeds the barber row
    const booked = await bookAppointment(
      req(`/api/s/${A.slug}/appointments`, {
        method: "POST",
        token: customer.token,
        body: { serviceId: A.serviceId, barberId: A.barberId, date: day, startTime: "09:15", customerName: "C", customerPhone: "123456", consent: true },
      }),
      slugP(A.slug),
    ).then(json);
    expect(booked.status).toBe(201);
    expect(JSON.stringify(booked.body)).not.toMatch(/commission/i);
  });
});
