import "server-only";

import { NextResponse } from "next/server";
import type { Salon } from "@prisma/client";

import prisma from "./prisma";

/**
 * Tenant resolution for PUBLIC routes (`/api/s/[slug]/...` and `/s/[slug]`).
 *
 * The slug is the only thing a visitor supplies; everything else in the request
 * is then scoped by the `salon.id` this returns. Dashboard routes do NOT use
 * this — they take `salonId` from the authenticated user (see `auth.ts`).
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= 60 && SLUG_RE.test(slug);
}

/** Active salon by slug, or null (unknown slug or deactivated salon). */
export async function getActiveSalon(slug: string): Promise<Salon | null> {
  if (!isValidSlug(slug)) return null;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  return salon && salon.isActive ? salon : null;
}

export type SalonGate = { salon: Salon } | { error: NextResponse };

/** For Route Handlers: `const g = await resolveSalon(params); if ("error" in g) return g.error;` */
export async function resolveSalon(params: Promise<{ slug: string }>): Promise<SalonGate> {
  const { slug } = await params;
  const salon = await getActiveSalon(slug);
  if (!salon) {
    return {
      error: NextResponse.json({ success: false, message: "Salon not found." }, { status: 404 }),
    };
  }
  return { salon };
}

/** Thrown when a request references another salon's records. Rendered as a 400 by `handleRouteError`. */
export class CrossTenantReferenceError extends Error {
  status = 400;
  expose = true;
  constructor(what: string) {
    super(`One or more ${what} do not belong to this salon.`);
  }
}

/** Every id must be a service of `salonId`, else throw. Guards `serviceIds` in barber writes. */
export async function assertServicesInSalon(salonId: string, ids: string[]) {
  if (ids.length === 0) return;
  const unique = [...new Set(ids)];
  const found = await prisma.service.count({ where: { salonId, id: { in: unique } } });
  if (found !== unique.length) throw new CrossTenantReferenceError("services");
}

/** Every id must be a barber of `salonId`, else throw. Guards `barberIds` in service writes. */
export async function assertBarbersInSalon(salonId: string, ids: string[]) {
  if (ids.length === 0) return;
  const unique = [...new Set(ids)];
  const found = await prisma.barber.count({ where: { salonId, id: { in: unique } } });
  if (found !== unique.length) throw new CrossTenantReferenceError("barbers");
}
