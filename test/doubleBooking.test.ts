// Integration test for the double-booking guarantee, against the REAL Postgres
// database in DATABASE_URL.
//
// Ported from `backend/test/doubleBooking.test.js`. The one structural change:
// the Express version drove the API with supertest against `app`. There is no
// Express app any more, so the Route Handlers are invoked DIRECTLY with a
// `NextRequest` — which is exactly what Next.js does at runtime, one layer of
// HTTP transport shorter. Concurrency is still real concurrency: two handler
// invocations raced with `Promise.all`, both hitting Postgres through the same
// PrismaClient, exactly as two simultaneous HTTP requests would.
//
// It creates its own throwaway `test-` SALON (with settings, hours, service,
// barber, owner) and removes exactly those rows in afterAll - it never runs a
// blanket deleteMany(), so real salons are left untouched.

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import type { Barber, Salon, Service, User } from "@prisma/client";

import prisma from "@/lib/server/prisma";
import { isExclusionViolation, SLOT_TAKEN_MESSAGE } from "@/lib/server/dbErrors";
import { toDateString, parseDateOnly, minutesToHHMM } from "@/lib/server/availability";
import { hashSync } from "@/lib/server/password";
import { dropCustomer, makeCustomer } from "./customerToken";

import { POST as postAppointment } from "@/app/api/s/[slug]/appointments/route";
import { POST as postLogin } from "@/app/api/auth/login/route";
import { GET as getAdminAppointments } from "@/app/api/dashboard/appointments/route";
import { PATCH as patchAdminAppointment } from "@/app/api/dashboard/appointments/[id]/route";
import { GET as getBarberAvailability } from "@/app/api/s/[slug]/barbers/[id]/availability/route";

const ORIGIN = "http://localhost:3000";

const RUN = `test-${Date.now()}`;
// Phone numbers are capped at 20 characters by the booking validation schema,
// so test phones get their own short unique prefix.
const PHONE = `t${String(Date.now()).slice(-9)}`;
const OWNER_PASSWORD = "TestOwner123!";

let salon: Salon;
let service: Service;
let barber: Omit<Barber, "commissionPercentage" | "commissionType" | "commissionFlatAmount">;
let owner: User;
let token: string;
let bookingDate: string;
let customer: { id: string; token: string };

/** Build the `NextRequest` a Route Handler would have received. */
function req(
  path: string,
  { method = "GET", body, token: bearer }: { method?: string; body?: unknown; token?: string } = {},
): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  // Public booking needs a customer session; default to the fixture customer.
  const auth = bearer ?? (method === "POST" && path.endsWith("/appointments") ? customer?.token : undefined);
  if (auth) headers.authorization = `Bearer ${auth}`;
  return new NextRequest(new URL(path, ORIGIN), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** `{ params }` as the App Router passes it — a PROMISE in this Next.js version. */
function ctx(id: string) {
  return { params: Promise.resolve({ slug: salon.slug, id }) };
}

/** `{ params }` for routes with only the `[slug]` segment. */
function slugCtx() {
  return { params: Promise.resolve({ slug: salon.slug }) };
}

async function readJson(response: Response) {
  return { status: response.status, body: await response.json() };
}

/** A near-future date the salon is actually open on (the seed closes Sundays). */
function pickOpenDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return toDateString(d);
}

function bookingBody(overrides: Record<string, unknown> = {}) {
  return {
    serviceId: service.id,
    barberId: barber.id,
    date: bookingDate,
    startTime: "11:00",
    customerName: "Race Tester",
    customerPhone: `${PHONE}-p0`,
    consent: true,
    ...overrides,
  };
}

const book = (overrides: Record<string, unknown> = {}) =>
  postAppointment(
    req(`/api/s/${salon.slug}/appointments`, { method: "POST", body: bookingBody(overrides) }),
    slugCtx(),
  ).then(readJson);

beforeAll(async () => {
  customer = await makeCustomer(RUN);
  salon = await prisma.salon.create({
    data: {
      slug: RUN,
      name: `${RUN} salon`,
      settings: { create: {} },
      // Open every day 09:00-21:00 so the fixture does not depend on the weekday.
      openingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          isOpen: true,
          openTime: 540,
          closeTime: 1260,
        })),
      },
    },
  });

  bookingDate = pickOpenDate(3);

  service = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: `${RUN}-service`,
      description: "Throwaway integration-test service",
      price: 100,
      durationMinutes: 30,
      category: "Test",
      isActive: true,
    },
  });

  // Works every weekday 09:00-21:00.
  barber = await prisma.barber.create({
    data: {
      salonId: salon.id,
      name: `${RUN}-barber`,
      email: `${RUN}@example.test`,
      specializations: [],
      isActive: true,
      services: { connect: { id: service.id } },
      workingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          isWorking: true,
          startTime: 540,
          endTime: 1260,
        })),
      },
    },
  });

  owner = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "Owner",
      email: `${RUN}@example.test`,
      password: hashSync(OWNER_PASSWORD),
      role: "OWNER",
      salonId: salon.id,
      enabled: true,
    },
  });

  const login = await readJson(
    await postLogin(
      req("/api/auth/login", {
        method: "POST",
        body: { email: owner.email, password: OWNER_PASSWORD },
      }),
    ),
  );
  expect(login.status).toBe(200);
  expect(login.body.success).toBe(true);
  token = login.body.token;
});

afterAll(async () => {
  // Targeted cleanup only, scoped to the throwaway salon.
  if (salon) {
    await prisma.appointment.deleteMany({ where: { salonId: salon.id } });
    await prisma.client.deleteMany({ where: { salonId: salon.id } });
    await prisma.user.deleteMany({ where: { salonId: salon.id } });
    await prisma.barber.deleteMany({ where: { salonId: salon.id } });
    await prisma.service.deleteMany({ where: { salonId: salon.id } });
    await prisma.salon.delete({ where: { id: salon.id } }).catch(() => {});
  }
  if (customer) await dropCustomer(customer.id);
  await prisma.$disconnect();
});

describe("the Postgres exclusion constraint itself", () => {
  test("two concurrent overlapping inserts: exactly one survives, the other raises 23P01", async () => {
    const base = {
      salonId: salon.id,
      barberId: barber.id,
      serviceId: service.id,
      appointmentDate: parseDateOnly(bookingDate),
      durationMinutes: 30,
      price: 100,
      status: "CONFIRMED" as const,
    };
    const client = await prisma.client.create({
      data: { salonId: salon.id, name: "Raw Race", phone: `${PHONE}-raw` },
    });

    const results = await Promise.allSettled([
      prisma.appointment.create({ data: { ...base, clientId: client.id, startTime: 900, endTime: 930 } }),
      prisma.appointment.create({ data: { ...base, clientId: client.id, startTime: 915, endTime: 945 } }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    // This is the exact detection path lib/server/dbErrors.ts implements.
    expect(isExclusionViolation(rejected[0].reason)).toBe(true);
    expect(String(rejected[0].reason.message)).toContain("23P01");

    await prisma.appointment.deleteMany({ where: { clientId: client.id } });
  });
});

describe("POST /api/s/[slug]/appointments concurrency", () => {
  test("two simultaneous bookings for the same barber/slot: one wins, one is told the slot is gone", async () => {
    const [first, second] = await Promise.all([
      book({ customerPhone: `${PHONE}-a` }),
      book({ customerPhone: `${PHONE}-b` }),
    ]);

    const responses = [first, second];
    const winners = responses.filter((r) => r.body && r.body.success === true);
    const losers = responses.filter((r) => !r.body || r.body.success !== true);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);

    expect(winners[0].status).toBe(201);
    expect(winners[0].body.appointment.barberId).toBe(barber.id);
    expect(winners[0].body.appointment.startTime).toBe(660);
    expect(winners[0].body.appointment.endTime).toBe(690);

    expect(losers[0].body).toEqual({ success: false, message: SLOT_TAKEN_MESSAGE });
    expect(losers[0].status).toBe(409);

    // And exactly one row exists for that slot.
    const stored = await prisma.appointment.findMany({
      where: { barberId: barber.id, appointmentDate: parseDateOnly(bookingDate), startTime: 660 },
    });
    expect(stored).toHaveLength(1);

    await prisma.appointment.deleteMany({ where: { barberId: barber.id } });
  });

  test("a later, sequential booking of the same slot is rejected with the same message", async () => {
    const ok = await book({ startTime: "12:00", customerPhone: `${PHONE}-c` });
    expect(ok.status).toBe(201);

    const clash = await book({ startTime: "12:00", customerPhone: `${PHONE}-d` });
    expect(clash.status).toBe(409);
    expect(clash.body).toEqual({ success: false, message: SLOT_TAKEN_MESSAGE });

    await prisma.appointment.deleteMany({ where: { barberId: barber.id } });
  });

  test("an off-grid startTime posted directly is rejected", async () => {
    const res = await book({ startTime: "12:07", customerPhone: `${PHONE}-e` });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("the client is de-duplicated by phone and the visit counter increments", async () => {
    const phone = `${PHONE}-rep`;
    const first = await book({
      startTime: "13:00",
      customerName: "Repeat Customer",
      customerPhone: phone,
    });
    expect(first.status).toBe(201);

    const second = await book({
      startTime: "14:00",
      customerName: "Repeat Customer",
      customerPhone: phone,
    });
    expect(second.status).toBe(201);

    const clients = await prisma.client.findMany({ where: { salonId: salon.id, phone } });
    expect(clients).toHaveLength(1);
    expect(clients[0].totalVisits).toBe(2);
    expect(second.body.appointment.clientId).toBe(first.body.appointment.clientId);

    await prisma.appointment.deleteMany({ where: { barberId: barber.id } });
  });
});

describe("cancelling frees the slot", () => {
  test("cancel then re-book the same overlapping time succeeds", async () => {
    const booked = await book({ startTime: "15:00", customerPhone: `${PHONE}-f` });
    expect(booked.status).toBe(201);
    const appointmentId = booked.body.appointment.id;

    // The slot is genuinely taken while the appointment is live.
    const blocked = await book({ startTime: "15:00", customerPhone: `${PHONE}-g` });
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toBe(SLOT_TAKEN_MESSAGE);

    const cancelled = await readJson(
      await patchAdminAppointment(
        req(`/api/dashboard/appointments/${appointmentId}`, {
          method: "PATCH",
          token,
          body: { status: "CANCELLED" },
        }),
        ctx(appointmentId),
      ),
    );
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.appointment.status).toBe("CANCELLED");

    // A cancelled row drops out of the exclusion constraint's WHERE clause.
    const rebooked = await book({ startTime: "15:00", customerPhone: `${PHONE}-h` });
    expect(rebooked.status).toBe(201);
    expect(rebooked.body.appointment.id).not.toBe(appointmentId);

    await prisma.appointment.deleteMany({ where: { barberId: barber.id } });
  });
});

describe("admin routes are actually protected", () => {
  test("no token is rejected", async () => {
    const res = await readJson(await getAdminAppointments(req("/api/dashboard/appointments")));
    expect(res.status).toBe(401);
  });

  test("a valid owner token is accepted", async () => {
    const res = await readJson(
      await getAdminAppointments(
        req(`/api/dashboard/appointments?date=${bookingDate}`, { token }),
      ),
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.appointments)).toBe(true);
  });
});

/**
 * NEW in the consolidation: the `excludeAppointmentId` fix M6 asked for.
 *
 * Before it, the availability READ path had no way to leave an appointment out
 * of the overlap check, while the reschedule WRITE path always did — so the
 * admin reschedule dialog was told fewer slots were free than the server would
 * actually accept.
 */
describe("excludeAppointmentId on GET /api/s/[slug]/barbers/:id/availability", () => {
  test("without it an appointment blocks its own slot; with it, that slot and every slot it overlaps are free again", async () => {
    const booked = await book({ startTime: "16:00", customerPhone: `${PHONE}-x` });
    expect(booked.status).toBe(201);
    const appointmentId = booked.body.appointment.id;

    const base = `/api/s/${salon.slug}/barbers/${barber.id}/availability?serviceId=${service.id}&date=${bookingDate}`;

    const without = await readJson(
      await getBarberAvailability(req(base), ctx(barber.id)),
    );
    const withExclude = await readJson(
      await getBarberAvailability(
        req(`${base}&excludeAppointmentId=${appointmentId}`),
        ctx(barber.id),
      ),
    );

    expect(without.status).toBe(200);
    expect(withExclude.status).toBe(200);

    type Slot = { start: string; end: string; available: boolean };
    const at = (payload: { slots: Slot[] }, hhmm: string) =>
      payload.slots.find((s) => s.start === hhmm);

    // A 30-minute service at 16:00 blocks the 15:45 and 16:00 starts.
    expect(at(without.body, "16:00")!.available).toBe(false);
    expect(at(without.body, "15:45")!.available).toBe(false);

    // Excluded, BOTH come back - not just the appointment's own start, which is
    // all the old client-side workaround could recover.
    expect(at(withExclude.body, "16:00")!.available).toBe(true);
    expect(at(withExclude.body, "15:45")!.available).toBe(true);

    // Nothing else moved.
    expect(withExclude.body.slots.length).toBe(without.body.slots.length);

    // And the write path agrees: rescheduling onto 15:45 (which overlaps the
    // appointment's own current time) is accepted.
    const moved = await readJson(
      await patchAdminAppointment(
        req(`/api/dashboard/appointments/${appointmentId}`, {
          method: "PATCH",
          token,
          body: {
            serviceId: service.id,
            barberId: barber.id,
            date: bookingDate,
            startTime: "15:45",
          },
        }),
        ctx(appointmentId),
      ),
    );
    expect(moved.status).toBe(200);
    expect(moved.body.appointment.startTime).toBe(945);
    expect(minutesToHHMM(moved.body.appointment.startTime)).toBe("15:45");

    await prisma.appointment.deleteMany({ where: { barberId: barber.id } });
  });
});
