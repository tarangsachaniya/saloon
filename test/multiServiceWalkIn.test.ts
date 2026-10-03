// Integration tests for multi-service bookings, owner/staff-recorded walk-ins,
// percent-or-flat worker commission and the online-only platform billing basis.
// Runs against the real Postgres in DATABASE_URL under throwaway `test-msw-`
// salons/users, all removed by exact id in afterAll; real data is never touched.

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { hashSync } from "@/lib/server/password";
import { generateToken } from "@/lib/server/jwt";
import { computeAvailability, toDateString } from "@/lib/server/availability";
import { calcWorkerCommission, isValidFlatAmount } from "@/lib/server/commissions";
import { platformBillableTotals } from "@/lib/server/billing";
import { makeCustomer } from "./customerToken";

import { POST as bookAppointment } from "@/app/api/s/[slug]/appointments/route";
import { GET as publicBarbers } from "@/app/api/s/[slug]/barbers/route";
import { POST as recordWalkIn } from "@/app/api/dashboard/appointments/route";
import { PATCH as patchAppointment } from "@/app/api/dashboard/appointments/[id]/route";
import { PATCH as patchCommission } from "@/app/api/dashboard/barbers/[id]/commission/route";
import { GET as commissionSummary } from "@/app/api/dashboard/commissions/summary/route";
import { GET as listCommissions } from "@/app/api/dashboard/commissions/route";
import { GET as getLogin, POST as createLogin, PATCH as patchLogin } from "@/app/api/dashboard/barbers/[id]/login/route";
import { GET as myEarnings } from "@/app/api/dashboard/my-earnings/route";
import { PATCH as patchBarber } from "@/app/api/dashboard/barbers/[id]/route";

const RUN = `test-msw-${Date.now()}`;
const ORIGIN = "http://localhost:3000";

type Tenant = {
  salonId: string;
  slug: string;
  token: string;
  staffToken: string;
  /** Does cut AND beard. */
  barberId: string;
  /** Does cut only. */
  cutOnlyBarberId: string;
  cutId: string;
  beardId: string;
};
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
      openingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, isOpen: true, openTime: 540, closeTime: 1260 })),
      },
    },
  });
  salonIds.push(salon.id);
  const cut = await prisma.service.create({ data: { salonId: salon.id, name: `${tag}-cut`, price: 500, durationMinutes: 30 } });
  const beard = await prisma.service.create({ data: { salonId: salon.id, name: `${tag}-beard`, price: 300, durationMinutes: 30 } });
  const hours = { create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: 540, endTime: 1260 })) };
  const barber = await prisma.barber.create({
    data: {
      salonId: salon.id,
      name: `${tag}-both`,
      commissionPercentage: 40,
      services: { connect: [{ id: cut.id }, { id: beard.id }] },
      workingHours: hours,
    },
  });
  const cutOnly = await prisma.barber.create({
    data: { salonId: salon.id, name: `${tag}-cutonly`, services: { connect: [{ id: cut.id }] }, workingHours: hours },
  });
  const mk = async (role: "OWNER" | "STAFF") => {
    const u = await prisma.user.create({
      data: { firstName: tag, email: `${RUN}-${tag}-${role}@example.test`, password: hashSync("Pass12345!"), role, salonId: salon.id },
    });
    userIds.push(u.id);
    return generateToken({ id: u.id, role: u.role });
  };
  return {
    salonId: salon.id,
    slug: salon.slug,
    token: await mk("OWNER"),
    staffToken: await mk("STAFF"),
    barberId: barber.id,
    cutOnlyBarberId: cutOnly.id,
    cutId: cut.id,
    beardId: beard.id,
  };
}

const book = (t: Tenant, body: Record<string, unknown>) =>
  bookAppointment(
    req(`/api/s/${t.slug}/appointments`, {
      method: "POST",
      token: customer.token,
      body: { date: day, customerName: "Multi", customerPhone: "9000000001", consent: true, ...body },
    }),
    slugP(t.slug),
  ).then(json);

const walkIn = (t: Tenant, body: Record<string, unknown>, token = t.staffToken) =>
  recordWalkIn(req("/api/dashboard/appointments", { method: "POST", token, body })).then(json);

const patch = (t: Tenant, id: string, body: Record<string, unknown>, token = t.token) =>
  patchAppointment(req(`/api/dashboard/appointments/${id}`, { method: "PATCH", token, body }), idP(id)).then(json);

const setRate = (t: Tenant, body: Record<string, unknown>, token = t.token) =>
  patchCommission(
    req(`/api/dashboard/barbers/${t.barberId}/commission`, { method: "PATCH", token, body }),
    idP(t.barberId),
  ).then(json);

const commissionFor = (appointmentId: string) => prisma.workerCommission.findUnique({ where: { appointmentId } });

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

describe("commission maths", () => {
  test("PERCENT is a share of the amount; FLAT is per service", () => {
    expect(calcWorkerCommission({ type: "PERCENT", percentage: 40, flatAmount: 99, amount: 800, serviceCount: 2 }).toString()).toBe("320");
    expect(calcWorkerCommission({ type: "FLAT", percentage: 40, flatAmount: 50, amount: 800, serviceCount: 3 }).toString()).toBe("150");
    expect(calcWorkerCommission({ type: "FLAT", percentage: 0, flatAmount: "12.5", amount: 0, serviceCount: 1 }).toString()).toBe("12.5");
  });

  test("flat amount validation", () => {
    for (const ok of [0, 50, 75.5, 1000000]) expect(isValidFlatAmount(ok)).toBe(true);
    for (const bad of [-1, 1.234, NaN, "50", null, 1000001]) expect(isValidFlatAmount(bad)).toBe(false);
  });
});

describe("multi-service booking", () => {
  test("only barbers offering EVERY chosen service are listed", async () => {
    const r = await publicBarbers(req(`/api/s/${A.slug}/barbers?serviceIds=${A.cutId},${A.beardId}`), slugP(A.slug)).then(json);
    expect(r.body.barbers.map((b: { id: string }) => b.id)).toEqual([A.barberId]);
    const legacy = await publicBarbers(req(`/api/s/${A.slug}/barbers?serviceId=${A.cutId}`), slugP(A.slug)).then(json);
    expect(legacy.body.barbers).toHaveLength(2);
  });

  test("availability uses the total duration", async () => {
    const r = await computeAvailability({ salonId: A.salonId, serviceIds: [A.cutId, A.beardId], barberId: A.barberId, date: day });
    expect(r.serviceDuration).toBe(60);
  });

  test("booking two services stores totals and both service rows, in order", async () => {
    const r = await book(A, { serviceIds: [A.beardId, A.cutId], barberId: "any", startTime: "10:00" });
    expect(r.status).toBe(201);
    const a = r.body.appointment;
    expect(a.barberId).toBe(A.barberId); // the cut-only barber cannot do the beard
    expect(a.durationMinutes).toBe(60);
    expect(Number(a.price)).toBe(800);
    expect(a.endTime - a.startTime).toBe(60);
    expect(a.source).toBe("ONLINE");
    expect(a.services.map((s: { serviceId: string }) => s.serviceId)).toEqual([A.beardId, A.cutId]);
  });

  test("the combined slot blocks an overlapping booking", async () => {
    const r = await book(A, { serviceIds: [A.cutId], barberId: A.barberId, startTime: "10:30" });
    expect(r.status).toBe(409);
  });

  test("legacy single serviceId still books", async () => {
    const r = await book(A, { serviceId: A.cutId, barberId: A.cutOnlyBarberId, startTime: "11:00" });
    expect(r.status).toBe(201);
    expect(r.body.appointment.services).toHaveLength(1);
  });

  test("a barber who lacks one of the services is rejected", async () => {
    const r = await book(A, { serviceIds: [A.cutId, A.beardId], barberId: A.cutOnlyBarberId, startTime: "12:00" });
    expect(r.status).toBe(404);
  });

  test("a staff reschedule keeps every service", async () => {
    const created = await book(A, { serviceIds: [A.cutId, A.beardId], barberId: A.barberId, startTime: "13:00" });
    const moved = await patch(A, created.body.appointment.id, { startTime: "14:00" });
    expect(moved.status).toBe(200);
    expect(moved.body.appointment.endTime - moved.body.appointment.startTime).toBe(60);
    expect(moved.body.appointment.services).toHaveLength(2);
  });
});

describe("commission rate: percent or flat", () => {
  test("owner sets FLAT and back to PERCENT; staff cannot", async () => {
    expect((await setRate(A, { commissionType: "FLAT", commissionFlatAmount: 50 }, A.staffToken)).status).toBe(403);
    expect((await setRate(A, { commissionType: "FLAT", commissionFlatAmount: -1 })).status).toBe(400);
    expect((await setRate(A, { commissionType: "BOGUS" })).status).toBe(400);
    const flat = await setRate(A, { commissionType: "FLAT", commissionFlatAmount: 50 });
    expect(flat.status).toBe(200);
    expect(flat.body.barber).toMatchObject({ commissionType: "FLAT", commissionFlatAmount: 50 });
    const pct = await setRate(A, { commissionPercentage: 40 }); // older clients: PERCENT
    expect(pct.body.barber).toMatchObject({ commissionType: "PERCENT", commissionPercentage: 40 });
  });

  test("the rate never reaches the public barber list", async () => {
    const pub = await publicBarbers(req(`/api/s/${A.slug}/barbers`), slugP(A.slug)).then(json);
    expect(JSON.stringify(pub.body)).not.toMatch(/commission/i);
  });
});

describe("walk-ins recorded by owner or staff", () => {
  test("a completed sale earns commission at once, on the amount paid", async () => {
    const r = await walkIn(A, {
      mode: "sale",
      barberId: A.barberId,
      serviceIds: [A.cutId, A.beardId],
      amountCharged: 700,
      customerName: "Walk In",
      customerPhone: "9000000002",
    });
    expect(r.status).toBe(201);
    const a = r.body.appointment;
    expect(a).toMatchObject({ status: "COMPLETED", source: "WALK_IN", blocksCalendar: false });
    expect(Number(a.price)).toBe(800);
    const c = await commissionFor(a.id);
    expect(c).toMatchObject({ source: "WALK_IN", commissionType: "PERCENT", serviceCount: 2 });
    expect(Number(c!.serviceAmount)).toBe(700);
    expect(Number(c!.commissionAmount)).toBe(280); // 40% of 700
  });

  test("FLAT rate pays per service; anonymous sale needs no customer", async () => {
    await setRate(A, { commissionType: "FLAT", commissionFlatAmount: 50 });
    const r = await walkIn(A, { mode: "sale", barberId: A.barberId, serviceIds: [A.cutId, A.beardId] }, A.token);
    expect(r.status).toBe(201);
    expect(r.body.appointment.clientId).toBeNull();
    const c = await commissionFor(r.body.appointment.id);
    expect(Number(c!.commissionAmount)).toBe(100); // 2 x 50
    await setRate(A, { commissionType: "PERCENT", commissionPercentage: 40 });
  });

  test("a recorded sale does not block the calendar (overlap constraint ignores it)", async () => {
    const today = toDateString(new Date());
    const sale = await walkIn(A, { mode: "sale", barberId: A.barberId, serviceIds: [A.cutId], date: today, startTime: "15:00" });
    expect(sale.status).toBe(201);
    // A calendar row for the same barber over the same minutes must still insert:
    // only rows with blocksCalendar take part in the EXCLUDE constraint.
    const overlapping = await prisma.appointment.create({
      data: {
        salonId: A.salonId,
        barberId: A.barberId,
        serviceId: A.cutId,
        appointmentDate: sale.body.appointment.appointmentDate,
        startTime: 900,
        endTime: 930,
        durationMinutes: 30,
        price: 500,
        status: "CONFIRMED",
      },
    });
    expect(overlapping.id).toBeTruthy();
    await prisma.appointment.delete({ where: { id: overlapping.id } });
  });

  test("a sale cannot be dated in the future", async () => {
    const r = await walkIn(A, { mode: "sale", barberId: A.barberId, serviceIds: [A.cutId], date: day });
    expect(r.status).toBe(400);
  });

  test("a calendar walk-in takes a real slot; completing it with an amount sets commission", async () => {
    const r = await walkIn(A, { mode: "appointment", barberId: A.barberId, serviceIds: [A.cutId], date: day, startTime: "16:00" });
    expect(r.status).toBe(201);
    expect(r.body.appointment).toMatchObject({ status: "CONFIRMED", source: "WALK_IN", blocksCalendar: true });
    // it blocks the slot like any booking
    expect((await book(A, { serviceIds: [A.cutId], barberId: A.barberId, startTime: "16:00" })).status).toBe(409);
    // staff complete it, entering what was paid
    const done = await patch(A, r.body.appointment.id, { status: "COMPLETED", amountCharged: 450 }, A.staffToken);
    expect(done.status).toBe(200);
    const c = await commissionFor(r.body.appointment.id);
    expect(Number(c!.serviceAmount)).toBe(450);
    expect(Number(c!.commissionAmount)).toBe(180);
    // the amount is final once completed
    expect((await patch(A, r.body.appointment.id, { amountCharged: 1 })).status).toBe(400);
  });

  test("validation and tenant isolation", async () => {
    expect((await walkIn(A, { mode: "sale", barberId: A.barberId, serviceIds: [] })).status).toBe(400);
    expect((await walkIn(A, { mode: "appointment", barberId: A.barberId, serviceIds: [A.cutId] })).status).toBe(400);
    expect((await walkIn(A, { mode: "sale", barberId: B.barberId, serviceIds: [A.cutId] })).status).toBe(404);
    expect((await walkIn(A, { mode: "sale", barberId: A.barberId, serviceIds: [B.cutId] })).status).toBe(404);
    expect(
      (await recordWalkIn(req("/api/dashboard/appointments", { method: "POST", token: customer.token, body: { mode: "sale", barberId: A.barberId, serviceIds: [A.cutId] } }))).status,
    ).toBe(401);
  });
});

describe("earnings and billing split by source", () => {
  test("summary counts online and walk-in work; history filters by source", async () => {
    // complete one ONLINE booking so both sources have commission
    const online = await book(A, { serviceIds: [A.cutId], barberId: A.barberId, startTime: "17:00" });
    expect((await patch(A, online.body.appointment.id, { status: "COMPLETED" })).status).toBe(200);

    const s = await commissionSummary(req("/api/dashboard/commissions/summary", { token: A.token })).then(json);
    const w = s.body.workers.find((x: { id: string }) => x.id === A.barberId);
    expect(w.onlineCount).toBe(1);
    expect(w.walkInCount).toBe(4);
    expect(w.commissionType).toBe("PERCENT");

    const walkIns = await listCommissions(req(`/api/dashboard/commissions?barberId=${A.barberId}&source=WALK_IN`, { token: A.token })).then(json);
    expect(walkIns.body.commissions).toHaveLength(4);
    expect(walkIns.body.commissions.every((c: { source: string }) => c.source === "WALK_IN")).toBe(true);
    expect((await listCommissions(req("/api/dashboard/commissions?source=QR", { token: A.token }))).status).toBe(400);
  });

  test("the platform bills completed ONLINE bookings only", async () => {
    const totals = await platformBillableTotals(A.salonId);
    expect(totals).toEqual({ completedBookings: 1, grossRevenue: 500 });
  });
});

describe("worker logins (created by the owner)", () => {
  let workerToken: string;

  test("only the owner creates a login; it is linked to the worker", async () => {
    const path = `/api/dashboard/barbers/${A.cutOnlyBarberId}/login`;
    const email = `${RUN}-worker@example.test`;
    expect((await createLogin(req(path, { method: "POST", token: A.staffToken, body: { email } }), idP(A.cutOnlyBarberId))).status).toBe(403);
    expect((await createLogin(req(`/api/dashboard/barbers/${B.barberId}/login`, { method: "POST", token: A.token, body: { email } }), idP(B.barberId))).status).toBe(404);

    const r = await createLogin(req(path, { method: "POST", token: A.token, body: { email } }), idP(A.cutOnlyBarberId)).then(json);
    expect(r.status).toBe(201);
    expect(r.body.credentials.temporaryPassword).toEqual(expect.any(String));
    expect(JSON.stringify(r.body.login)).not.toMatch(/password/i);
    userIds.push(r.body.login.id);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: r.body.login.id } });
    expect(user).toMatchObject({ role: "STAFF", salonId: A.salonId, barberId: A.cutOnlyBarberId });
    workerToken = generateToken({ id: user.id, role: user.role });

    // one login per worker, and the email must be free
    expect((await createLogin(req(path, { method: "POST", token: A.token, body: { email: `${RUN}-other@example.test` } }), idP(A.cutOnlyBarberId))).status).toBe(409);
    const got = await getLogin(req(path, { token: A.token }), idP(A.cutOnlyBarberId)).then(json);
    expect(got.body.login.email).toBe(email);
  });

  test("a linked worker records walk-ins only as themselves, entering the amount", async () => {
    expect((await walkIn(A, { mode: "sale", barberId: A.barberId, serviceIds: [A.cutId] }, workerToken)).status).toBe(403);
    const own = await walkIn(A, { mode: "sale", barberId: A.cutOnlyBarberId, serviceIds: [A.cutId], amountCharged: 400 }, workerToken);
    expect(own.status).toBe(201);
    expect(Number(own.body.appointment.amountCharged)).toBe(400);
  });

  test("my-earnings shows only the worker's own commission", async () => {
    const mine = await myEarnings(req("/api/dashboard/my-earnings", { token: workerToken })).then(json);
    expect(mine.status).toBe(200);
    expect(mine.body.worker.id).toBe(A.cutOnlyBarberId);
    expect(mine.body.commissions.length).toBeGreaterThanOrEqual(1);
    // the unlinked staff login has no "own" earnings
    expect((await myEarnings(req("/api/dashboard/my-earnings", { token: A.staffToken }))).status).toBe(404);
  });

  test("owner can disable the login and reset its password", async () => {
    const path = `/api/dashboard/barbers/${A.cutOnlyBarberId}/login`;
    const off = await patchLogin(req(path, { method: "PATCH", token: A.token, body: { enabled: false } }), idP(A.cutOnlyBarberId)).then(json);
    expect(off.body.login.enabled).toBe(false);
    expect((await myEarnings(req("/api/dashboard/my-earnings", { token: workerToken }))).status).toBe(401);
    const reset = await patchLogin(req(path, { method: "PATCH", token: A.token, body: { resetPassword: true } }), idP(A.cutOnlyBarberId)).then(json);
    expect(reset.body.credentials.temporaryPassword).toEqual(expect.any(String));
  });
});

describe("per-worker online pre-booking switch", () => {
  const setOnline = (on: boolean) =>
    patchBarber(
      req(`/api/dashboard/barbers/${A.barberId}`, { method: "PATCH", token: A.token, body: { onlineBookingEnabled: on } }),
      idP(A.barberId),
    ).then(json);

  test("off: hidden online and not bookable, but walk-ins still work", async () => {
    expect((await setOnline(false)).status).toBe(200);

    const list = await publicBarbers(req(`/api/s/${A.slug}/barbers`), slugP(A.slug)).then(json);
    expect(list.body.barbers.map((b: { id: string }) => b.id)).not.toContain(A.barberId);

    expect((await book(A, { serviceIds: [A.cutId], barberId: A.barberId, startTime: "18:00" })).status).toBe(404);
    // "any barber" never lands on them either: the cut-only worker gets it.
    const any = await book(A, { serviceIds: [A.cutId], barberId: "any", startTime: "18:00" });
    expect(any.status).toBe(201);
    expect(any.body.appointment.barberId).toBe(A.cutOnlyBarberId);

    expect((await walkIn(A, { mode: "sale", barberId: A.barberId, serviceIds: [A.cutId] }, A.token)).status).toBe(201);
  });

  test("back on: bookable online again", async () => {
    expect((await setOnline(true)).status).toBe(200);
    expect((await book(A, { serviceIds: [A.cutId], barberId: A.barberId, startTime: "18:30" })).status).toBe(201);
  });
});
