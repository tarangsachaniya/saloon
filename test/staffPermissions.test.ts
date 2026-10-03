// A worker (STAFF) login only records its own offline data: it must not add,
// edit or remove services or barbers, edit settings, or upload images for
// them, while still being able to READ those lists and record a sale. Runs
// against the real Postgres in DATABASE_URL under a throwaway `test-perm-`
// salon, removed by exact id in afterAll.

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { NextRequest } from "next/server";

import prisma from "@/lib/server/prisma";
import { hashSync } from "@/lib/server/password";
import { generateToken } from "@/lib/server/jwt";

import { GET as listServices, POST as createService } from "@/app/api/dashboard/services/route";
import { PATCH as patchService, DELETE as deleteService } from "@/app/api/dashboard/services/[id]/route";
import { GET as listBarbers, POST as createBarber } from "@/app/api/dashboard/barbers/route";
import { PATCH as patchBarber, DELETE as deleteBarber } from "@/app/api/dashboard/barbers/[id]/route";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/dashboard/settings/route";
import { POST as createUpload } from "@/app/api/uploads/route";
import { POST as recordSale } from "@/app/api/dashboard/appointments/route";

const RUN = `test-perm-${Date.now()}`;
const ORIGIN = "http://localhost:3000";

let salonId: string;
let ownerToken: string;
let staffToken: string;
let linkedToken: string;
let barberId: string;
let otherBarberId: string;
let serviceId: string;
const userIds: string[] = [];

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
const status = async (r: Response | Promise<Response>) => (await r).status;

beforeAll(async () => {
  const salon = await prisma.salon.create({
    data: {
      slug: RUN,
      name: RUN,
      settings: { create: {} },
      openingHours: { create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, isOpen: true, openTime: 540, closeTime: 1260 })) },
    },
  });
  salonId = salon.id;
  const service = await prisma.service.create({ data: { salonId, name: "perm-svc", price: 500, durationMinutes: 30 } });
  serviceId = service.id;
  const barber = await prisma.barber.create({ data: { salonId, name: "perm-barber", services: { connect: { id: serviceId } } } });
  const other = await prisma.barber.create({ data: { salonId, name: "perm-other", services: { connect: { id: serviceId } } } });
  barberId = barber.id;
  otherBarberId = other.id;

  const mk = async (tag: string, role: "OWNER" | "STAFF", linkedBarber?: string) => {
    const u = await prisma.user.create({
      data: {
        firstName: tag,
        email: `${RUN}-${tag}@example.test`,
        password: hashSync("Pass12345!"),
        role,
        salonId,
        ...(linkedBarber ? { barberId: linkedBarber } : {}),
      },
    });
    userIds.push(u.id);
    return generateToken({ id: u.id, role: u.role });
  };
  ownerToken = await mk("owner", "OWNER");
  staffToken = await mk("staff", "STAFF");
  linkedToken = await mk("linked", "STAFF", barberId);
});

afterAll(async () => {
  await prisma.workerCommission.deleteMany({ where: { salonId } });
  await prisma.appointment.deleteMany({ where: { salonId } });
  await prisma.client.deleteMany({ where: { salonId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.barber.deleteMany({ where: { salonId } });
  await prisma.service.deleteMany({ where: { salonId } });
  await prisma.salon.deleteMany({ where: { id: salonId } });
  await prisma.$disconnect();
});

describe("staff cannot change services, barbers or settings", () => {
  test("services: read yes, write no", async () => {
    expect(await status(listServices(req("/api/dashboard/services", { token: staffToken })))).toBe(200);
    const body = { name: "Hacked", price: 1, durationMinutes: 30 };
    expect(await status(createService(req("/api/dashboard/services", { method: "POST", token: staffToken, body })))).toBe(403);
    expect(await status(patchService(req(`/api/dashboard/services/${serviceId}`, { method: "PATCH", token: staffToken, body: { price: 1 } }), idP(serviceId)))).toBe(403);
    expect(await status(deleteService(req(`/api/dashboard/services/${serviceId}`, { method: "DELETE", token: staffToken }), idP(serviceId)))).toBe(403);
    const svc = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(Number(svc.price)).toBe(500);
    expect(await prisma.service.count({ where: { salonId, name: "Hacked" } })).toBe(0);
  });

  test("barbers: read yes, write no, and no commission data in the read", async () => {
    const list = await listBarbers(req("/api/dashboard/barbers", { token: staffToken }));
    expect(list.status).toBe(200);
    expect(JSON.stringify(await list.json())).not.toMatch(/commission/i);
    expect(await status(createBarber(req("/api/dashboard/barbers", { method: "POST", token: staffToken, body: { name: "Hacked" } })))).toBe(403);
    expect(await status(patchBarber(req(`/api/dashboard/barbers/${barberId}`, { method: "PATCH", token: staffToken, body: { name: "Hacked", onlineBookingEnabled: false } }), idP(barberId)))).toBe(403);
    expect(await status(deleteBarber(req(`/api/dashboard/barbers/${barberId}`, { method: "DELETE", token: staffToken }), idP(barberId)))).toBe(403);
    const b = await prisma.barber.findUniqueOrThrow({ where: { id: barberId } });
    expect(b).toMatchObject({ name: "perm-barber", isActive: true, onlineBookingEnabled: true });
    expect(await prisma.barber.count({ where: { salonId, name: "Hacked" } })).toBe(0);
  });

  test("settings: read yes, write no; uploads are owner-only", async () => {
    expect(await status(getSettings(req("/api/dashboard/settings", { token: staffToken })))).toBe(200);
    expect(await status(patchSettings(req("/api/dashboard/settings", { method: "PATCH", token: staffToken, body: { name: "Hacked" } })))).toBe(403);
    const salon = await prisma.salon.findUniqueOrThrow({ where: { id: salonId } });
    expect(salon.name).toBe(RUN);
    const upload = { kind: "logo", contentType: "image/png", size: 5000 };
    expect(await status(createUpload(req("/api/uploads", { method: "POST", token: staffToken, body: upload })))).toBe(403);
  });

  test("the owner still can", async () => {
    const created = await createService(req("/api/dashboard/services", { method: "POST", token: ownerToken, body: { name: "perm-extra", price: 100, durationMinutes: 15 } }));
    expect(created.status).toBe(201);
    const id = (await created.json()).service.id as string;
    expect(await status(patchService(req(`/api/dashboard/services/${id}`, { method: "PATCH", token: ownerToken, body: { price: 120 } }), idP(id)))).toBe(200);
    expect(await status(patchBarber(req(`/api/dashboard/barbers/${otherBarberId}`, { method: "PATCH", token: ownerToken, body: { onlineBookingEnabled: false } }), idP(otherBarberId)))).toBe(200);
    expect(await status(patchSettings(req("/api/dashboard/settings", { method: "PATCH", token: ownerToken, body: { phone: "9000000000" } })))).toBe(200);
  });
});

describe("staff record their own offline data", () => {
  const sale = (token: string, body: Record<string, unknown>) =>
    recordSale(req("/api/dashboard/appointments", { method: "POST", token, body }));

  test("a linked worker records a sale as themselves (no mode needed), not for someone else", async () => {
    const own = await sale(linkedToken, { barberId, serviceIds: [serviceId], amountCharged: 400 });
    expect(own.status).toBe(201);
    const a = (await own.json()).appointment;
    expect(a).toMatchObject({ status: "COMPLETED", source: "WALK_IN", blocksCalendar: false });
    expect(await prisma.workerCommission.count({ where: { appointmentId: a.id } })).toBe(1);

    expect((await sale(linkedToken, { barberId: otherBarberId, serviceIds: [serviceId] })).status).toBe(403);
  });

  test("an old client still sending mode:'sale' works; the calendar mode is refused", async () => {
    expect((await sale(staffToken, { mode: "sale", barberId, serviceIds: [serviceId] })).status).toBe(201);
    expect((await sale(staffToken, { mode: "appointment", barberId, serviceIds: [serviceId], date: "2030-01-01", startTime: "10:00" })).status).toBe(400);
  });
});
