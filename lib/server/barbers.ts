import "server-only";

import type { Prisma } from "@prisma/client";

import { parseDateOnly } from "./availability";

/**
 * Shared barber write helpers, lifted out of
 * `backend/controller/barberController.js` so the create and update Route
 * Handlers build identical Prisma payloads.
 */

export const BARBER_DETAIL_INCLUDE: Prisma.BarberInclude = {
  services: { select: { id: true, name: true, durationMinutes: true, price: true, isActive: true } },
  workingHours: { orderBy: { weekday: "asc" } },
  breaks: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
  daysOff: { orderBy: { date: "asc" } },
};

type Body = Record<string, unknown>;

/**
 * Nested writes for the weekly schedule. Any supplied array REPLACES the
 * barber's existing set wholesale (delete-then-recreate), which is exactly what
 * the admin schedule editor expects.
 */
export function scheduleWrites(body: Body): Record<string, unknown> {
  const nested: Record<string, unknown> = {};

  if (Array.isArray(body.serviceIds)) {
    nested.services = { set: (body.serviceIds as string[]).map((id) => ({ id })) };
  }
  if (Array.isArray(body.workingHours)) {
    nested.workingHours = {
      deleteMany: {},
      create: (body.workingHours as Array<Record<string, unknown>>).map((w) => ({
        weekday: w.weekday,
        isWorking: w.isWorking !== undefined ? w.isWorking : true,
        startTime: w.startTime,
        endTime: w.endTime,
      })),
    };
  }
  if (Array.isArray(body.breaks)) {
    nested.breaks = {
      deleteMany: {},
      create: (body.breaks as Array<Record<string, unknown>>).map((b) => ({
        weekday: b.weekday,
        startTime: b.startTime,
        endTime: b.endTime,
        label: b.label || null,
      })),
    };
  }
  if (Array.isArray(body.daysOff)) {
    nested.daysOff = {
      deleteMany: {},
      create: (body.daysOff as Array<Record<string, unknown>>).map((d) => ({
        date: parseDateOnly(String(d.date)),
        reason: d.reason || null,
      })),
    };
  }
  return nested;
}

export function scalarFields(body: Body): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of ["name", "phone", "email", "photo", "bio", "isActive", "onlineBookingEnabled"]) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (Array.isArray(body.specializations)) data.specializations = body.specializations;
  return data;
}

/**
 * Active barbers for Server Components (e.g. landing page showcase).
 */
export async function listActiveBarbersView(salonId: string) {
  const prismaModule = await import("./prisma");
  const barbers = await prismaModule.default.barber.findMany({
    where: { salonId, isActive: true },
    orderBy: { name: "asc" },
    include: {
      services: { select: { id: true, name: true, durationMinutes: true, price: true, isActive: true } },
      workingHours: true,
    },
  });

  return barbers.map((b) => ({
    id: b.id,
    name: b.name,
    phone: b.phone,
    email: b.email,
    photo: b.photo,
    bio: b.bio,
    specializations: b.specializations,
    isActive: b.isActive,
    services: b.services.map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.durationMinutes,
      price: Number(s.price),
      isActive: s.isActive,
    })),
    workingHours: b.workingHours,
  }));
}

