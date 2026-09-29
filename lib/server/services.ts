import "server-only";

import prisma from "./prisma";
import type { Service } from "@/lib/booking/types";

/**
 * Service reads, shared by the Route Handlers and by Server Components.
 *
 * TWO SHAPES ON PURPOSE:
 *
 *  - `listServices` / `getServiceById` return the RAW Prisma rows. That is what
 *    the Route Handlers serialise, and it preserves the exact wire format the
 *    Express backend produced (`price` as a Decimal-string, etc.) which
 *    `lib/api/normalize.ts` on the client already knows how to read. Changing
 *    it here would break that contract.
 *
 *  - `listActiveServicesView` returns the domain `Service` type with `price`
 *    already a number, for Server Components that consume the data directly
 *    instead of going through `lib/api`. They never touch the HTTP layer, so
 *    they never get the client-side normaliser, and a Prisma `Decimal` object
 *    would reach `formatPrice()` as `NaN`.
 */

export const SERVICE_INCLUDE = {
  barbers: { select: { id: true, name: true, isActive: true } },
} as const;

export function listServices(salonId: string, { includeInactive = false } = {}) {
  return prisma.service.findMany({
    where: includeInactive ? { salonId } : { salonId, isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: SERVICE_INCLUDE,
  });
}

export function getServiceById(salonId: string, id: string) {
  return prisma.service.findFirst({ where: { id, salonId }, include: SERVICE_INCLUDE });
}

/**
 * Active services as the plain domain type — the direct-Prisma equivalent of
 * `getServices()` from `lib/api`, for Server Components.
 */
export async function listActiveServicesView(salonId: string): Promise<Service[]> {
  const services = await listServices(salonId);
  return services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    // Prisma Decimal -> number, exactly what `normalizeService` does client-side.
    price: Number(service.price),
    durationMinutes: service.durationMinutes,
    category: service.category,
    isActive: service.isActive,
  }));
}
