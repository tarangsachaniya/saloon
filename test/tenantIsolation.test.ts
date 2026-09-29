// Cross-tenant isolation: salon A's people and URLs must never see or change
// salon B's data. Runs against the real database in DATABASE_URL using two
// throwaway `test-` salons that afterAll removes (scoped deletes only).

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import type { Salon, User } from "@prisma/client";

import prisma from "@/lib/server/prisma";
import { hashSync } from "@/lib/server/password";
import { generateToken } from "@/lib/server/jwt";
import { parseDateOnly, toDateString } from "@/lib/server/availability";

import { POST as postAppointment } from "@/app/api/s/[slug]/appointments/route";
import { GET as getServices } from "@/app/api/s/[slug]/services/route";
import { GET as getSettings } from "@/app/api/s/[slug]/settings/route";
import { GET as listAppointments } from "@/app/api/dashboard/appointments/route";
import { GET as getAppointment } from "@/app/api/dashboard/appointments/[id]/route";
import { GET as listClients } from "@/app/api/dashboard/clients/route";
import { GET as getClient } from "@/app/api/dashboard/clients/[id]/route";
import { PATCH as patchBarber } from "@/app/api/dashboard/barbers/[id]/route";
import { POST as postBarber } from "@/app/api/dashboard/barbers/route";
import { PATCH as patchService } from "@/app/api/dashboard/services/[id]/route";
import { GET as getMe } from "@/app/api/auth/me/route";

const ORIGIN = "http://localhost:3000";
const RUN = `test-iso-${Date.now()}`;

type Tenant = {
  salon: Salon;
  owner: User;
  token: string;
  serviceId: string;
  barberId: string;
  clientId: string;
  appointmentId: string;
};

const created: string[] = []; // salon ids
let A: Tenant;
let B: Tenant;
let superAdmin: User;
let superToken: string;
let bookingDate: string;

function req(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  return new NextRequest(new URL(path, ORIGIN), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}
const slugP = (slug: string) => ({ params: Promise.resolve({ slug }) });
const idP = (id: string) => ({ params: Promise.resolve({ id }) });
const json = async (r: Response) => ({ status: r.status, body: await r.json() });

async function makeTenant(tag: string): Promise<Tenant> {
  const salon = await prisma.salon.create({
    data: {
      slug: `${RUN}-${tag}`,
      name: `${RUN} ${tag}`,
      settings: { create: {} },
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
  created.push(salon.id);

  const service = await prisma.service.create({
    data: { salonId: salon.id, name: `${tag}-svc`, price: 100, durationMinutes: 30 },
  });
  const barber = await prisma.barber.create({
    data: {
      salonId: salon.id,
      name: `${tag}-barber`,
      services: { connect: { id: service.id } },
      workingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          startTime: 540,
          endTime: 1260,
        })),
      },
    },
  });
  const owner = await prisma.user.create({
    data: {
      firstName: tag,
      email: `${RUN}-${tag}@example.test`,
      password: hashSync("Pass12345!"),
      role: "OWNER",
      salonId: salon.id,
    },
  });
  const client = await prisma.client.create({
    data: { salonId: salon.id, name: `${tag}-client`, phone: `9${tag}${Date.now()}`.slice(0, 15) },
  });
  const appointment = await prisma.appointment.create({
    data: {
      salonId: salon.id,
      clientId: client.id,
      barberId: barber.id,
      serviceId: service.id,
      appointmentDate: parseDateOnly(bookingDate),
      startTime: 600,
      endTime: 630,
      durationMinutes: 30,
      price: 100,
    },
  });
  return {
    salon,
    owner,
    token: generateToken({ id: owner.id, role: owner.role }),
    serviceId: service.id,
    barberId: barber.id,
    clientId: client.id,
    appointmentId: appointment.id,
  };
}

beforeAll(async () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  bookingDate = toDateString(d);

  A = await makeTenant("a");
  B = await makeTenant("b");

  superAdmin = await prisma.user.create({
    data: {
      firstName: "Super",
      email: `${RUN}-super@example.test`,
      password: hashSync("Pass12345!"),
      role: "SUPER_ADMIN",
    },
  });
  superToken = generateToken({ id: superAdmin.id, role: superAdmin.role });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
  for (const salonId of created) {
    await prisma.appointment.deleteMany({ where: { salonId } });
    await prisma.client.deleteMany({ where: { salonId } });
    await prisma.barber.deleteMany({ where: { salonId } });
    await prisma.service.deleteMany({ where: { salonId } });
    await prisma.salon.delete({ where: { id: salonId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe("dashboard reads are scoped to the caller's salon", () => {
  test("A's appointment list contains only A's appointments", async () => {
    const res = await json(
      await listAppointments(req(`/api/dashboard/appointments?date=${bookingDate}`, { token: A.token })),
    );
    expect(res.status).toBe(200);
    const ids = res.body.appointments.map((x: { id: string }) => x.id);
    expect(ids).toContain(A.appointmentId);
    expect(ids).not.toContain(B.appointmentId);
  });

  test("A cannot fetch B's appointment by id (404, not 403 - no existence leak)", async () => {
    const res = await json(
      await getAppointment(
        req(`/api/dashboard/appointments/${B.appointmentId}`, { token: A.token }),
        idP(B.appointmentId),
      ),
    );
    expect(res.status).toBe(404);
  });

  test("A's client list excludes B's clients; B's client by id is 404", async () => {
    const list = await json(await listClients(req("/api/dashboard/clients?take=500", { token: A.token })));
    const ids = list.body.clients.map((c: { id: string }) => c.id);
    expect(ids).toContain(A.clientId);
    expect(ids).not.toContain(B.clientId);

    const one = await json(
      await getClient(req(`/api/dashboard/clients/${B.clientId}`, { token: A.token }), idP(B.clientId)),
    );
    expect(one.status).toBe(404);
  });
});

describe("dashboard writes cannot touch another salon", () => {
  test("A cannot PATCH B's barber or service (404) and B's data is unchanged", async () => {
    const barber = await json(
      await patchBarber(
        req(`/api/dashboard/barbers/${B.barberId}`, { method: "PATCH", token: A.token, body: { name: "HACKED" } }),
        idP(B.barberId),
      ),
    );
    expect(barber.status).toBe(404);

    const service = await json(
      await patchService(
        req(`/api/dashboard/services/${B.serviceId}`, { method: "PATCH", token: A.token, body: { name: "HACKED" } }),
        idP(B.serviceId),
      ),
    );
    expect(service.status).toBe(404);

    const stillB = await prisma.barber.findUnique({ where: { id: B.barberId } });
    expect(stillB?.name).toBe("b-barber");
  });

  test("A cannot link B's service to a new barber (400)", async () => {
    const res = await json(
      await postBarber(
        req("/api/dashboard/barbers", {
          method: "POST",
          token: A.token,
          body: { name: "Sneaky", serviceIds: [B.serviceId] },
        }),
      ),
    );
    expect(res.status).toBe(400);
    expect(await prisma.barber.count({ where: { name: "Sneaky" } })).toBe(0);
  });

  test("A cannot attach B's barber to A's service (400)", async () => {
    const res = await json(
      await patchService(
        req(`/api/dashboard/services/${A.serviceId}`, {
          method: "PATCH",
          token: A.token,
          body: { barberIds: [B.barberId] },
        }),
        idP(A.serviceId),
      ),
    );
    expect(res.status).toBe(400);
  });
});

describe("public routes are pinned to the slug's salon", () => {
  test("services list returns only that salon's services", async () => {
    const res = await json(await getServices(req(`/api/s/${A.salon.slug}/services`), slugP(A.salon.slug)));
    const ids = res.body.services.map((s: { id: string }) => s.id);
    expect(ids).toContain(A.serviceId);
    expect(ids).not.toContain(B.serviceId);
  });

  test("booking on A's page with B's service or barber is rejected", async () => {
    const base = { date: bookingDate, startTime: "11:00", customerName: "X", customerPhone: "55555", consent: true };
    const wrongService = await json(
      await postAppointment(
        req(`/api/s/${A.salon.slug}/appointments`, {
          method: "POST",
          body: { ...base, serviceId: B.serviceId, barberId: "any" },
        }),
        slugP(A.salon.slug),
      ),
    );
    expect(wrongService.status).toBe(404);

    const wrongBarber = await json(
      await postAppointment(
        req(`/api/s/${A.salon.slug}/appointments`, {
          method: "POST",
          body: { ...base, serviceId: A.serviceId, barberId: B.barberId },
        }),
        slugP(A.salon.slug),
      ),
    );
    expect(wrongBarber.status).toBe(404);
  });

  test("unknown slug and deactivated salon are 404, and its staff are locked out", async () => {
    const unknown = await json(await getSettings(req("/api/s/no-such-salon/settings"), slugP("no-such-salon")));
    expect(unknown.status).toBe(404);

    await prisma.salon.update({ where: { id: B.salon.id }, data: { isActive: false } });
    try {
      const inactive = await json(await getSettings(req(`/api/s/${B.salon.slug}/settings`), slugP(B.salon.slug)));
      expect(inactive.status).toBe(404);
      const staff = await json(await listAppointments(req("/api/dashboard/appointments", { token: B.token })));
      expect(staff.status).toBe(401);
    } finally {
      await prisma.salon.update({ where: { id: B.salon.id }, data: { isActive: true } });
    }
  });
});

describe("consent is mandatory to book", () => {
  test("missing or false consent is a 400; true is stored with a version", async () => {
    const body = {
      serviceId: A.serviceId,
      barberId: A.barberId,
      date: bookingDate,
      startTime: "13:00",
      customerName: "C",
      customerPhone: "77777",
    };
    const url = `/api/s/${A.salon.slug}/appointments`;
    const missing = await json(await postAppointment(req(url, { method: "POST", body }), slugP(A.salon.slug)));
    expect(missing.status).toBe(400);
    const no = await json(
      await postAppointment(req(url, { method: "POST", body: { ...body, consent: false } }), slugP(A.salon.slug)),
    );
    expect(no.status).toBe(400);

    const ok = await json(
      await postAppointment(req(url, { method: "POST", body: { ...body, consent: true } }), slugP(A.salon.slug)),
    );
    expect(ok.status).toBe(201);
    const row = await prisma.appointment.findUnique({ where: { id: ok.body.appointment.id } });
    expect(row?.consentAt).not.toBeNull();
    expect(row?.consentVersion).toBeTruthy();
    expect(row?.salonId).toBe(A.salon.id);
  });
});

describe("roles", () => {
  test("a SUPER_ADMIN has no salon, so the salon dashboard is closed to them", async () => {
    const res = await json(await listAppointments(req("/api/dashboard/appointments", { token: superToken })));
    expect(res.status).toBe(401);
  });

  test("/api/auth/me works for SUPER_ADMIN and reports the salon for staff", async () => {
    const sup = await json(await getMe(req("/api/auth/me", { token: superToken })));
    expect(sup.status).toBe(200);
    expect(sup.body.user.role).toBe("SUPER_ADMIN");
    expect(sup.body.user.salonSlug).toBeNull();

    const staff = await json(await getMe(req("/api/auth/me", { token: A.token })));
    expect(staff.body.user.salonSlug).toBe(A.salon.slug);
  });
});
