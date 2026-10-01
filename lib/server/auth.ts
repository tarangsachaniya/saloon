import "server-only";

import { NextResponse } from "next/server";
import type { User } from "@prisma/client";

import prisma from "./prisma";
import { validateToken } from "./jwt";

/**
 * Multi-salon auth.
 *
 * One `Authorization: Bearer <token>` header, one User table, three roles:
 *
 *   SUPER_ADMIN  platform operator; has no salon (`salonId` null)
 *   OWNER/STAFF  bound to exactly ONE salon via `user.salonId`
 *
 * TENANCY RULE: the salon a dashboard request acts on always comes from the
 * verified user row here, never from the URL or body. `requireAdmin` hands the
 * caller a `salonId` it must put in every query's `where`.
 *
 *   const auth = await requireAdmin(request);   // salon staff gate
 *   if ("error" in auth) return auth.error;
 *   const { user, salonId } = auth;
 *
 *   const auth = await requireSuperAdmin(request); // platform gate
 */

export const SALON_ROLES = ["OWNER", "STAFF"] as const;

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/** Any enabled user (any role) behind a valid token. */
async function loadUserFromRequest(request: Request): Promise<User | null> {
  const token = readBearerToken(request);
  if (!token) return null;

  const decoded = validateToken(token);
  if (!decoded || !decoded.id) return null;

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.enabled) return null;
  return user;
}

/** Salon staff only, and only while their salon is active. */
async function loadSalonStaff(request: Request): Promise<(User & { salonId: string }) | null> {
  const user = await loadUserFromRequest(request);
  if (!user || !user.salonId) return null;
  if (!SALON_ROLES.includes(user.role as (typeof SALON_ROLES)[number])) return null;

  const salon = await prisma.salon.findUnique({
    where: { id: user.salonId },
    select: { isActive: true },
  });
  if (!salon || !salon.isActive) return null;
  return user as User & { salonId: string };
}

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
const forbidden = () =>
  NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
const serverError = () =>
  NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });

export type StaffGate = { user: User; salonId: string } | { error: NextResponse };

/** Hard gate for every salon-dashboard route. */
export async function requireAdmin(request: Request): Promise<StaffGate> {
  try {
    const user = await loadSalonStaff(request);
    if (!user) return { error: unauthorized() };
    return { user, salonId: user.salonId };
  } catch (error) {
    console.error("[auth] failed to load user:", error);
    return { error: serverError() };
  }
}

/** OWNER-only actions inside a salon (policies, billing view, staff, data export). */
export async function requireOwner(request: Request): Promise<StaffGate> {
  const gate = await requireAdmin(request);
  if ("error" in gate) return gate;
  if (gate.user.role !== "OWNER") return { error: forbidden() };
  return gate;
}

export type PlatformGate = { user: User } | { error: NextResponse };

/** Hard gate for `/api/platform/*`. */
export async function requireSuperAdmin(request: Request): Promise<PlatformGate> {
  try {
    const user = await loadUserFromRequest(request);
    if (!user) return { error: unauthorized() };
    if (user.role !== "SUPER_ADMIN") return { error: forbidden() };
    return { user };
  } catch (error) {
    console.error("[auth] failed to load user:", error);
    return { error: serverError() };
  }
}

/** Any signed-in user of any role (used by `/api/auth/me`). */
export async function requireUser(request: Request): Promise<PlatformGate> {
  try {
    const user = await loadUserFromRequest(request);
    if (!user) return { error: unauthorized() };
    return { user };
  } catch (error) {
    console.error("[auth] failed to load user:", error);
    return { error: serverError() };
  }
}

/**
 * Soft gate for public endpoints that behave differently for a salon's own
 * staff (e.g. `?includeInactive=true`). Returns the user ONLY if they belong
 * to `salonId` — staff of salon A get no special treatment on salon B's page.
 * Never rejects.
 */
export async function getOptionalStaff(request: Request, salonId: string): Promise<User | null> {
  try {
    const user = await loadSalonStaff(request);
    return user && user.salonId === salonId ? user : null;
  } catch {
    return null;
  }
}

/**
 * Soft gate for public endpoints that link the request to a signed-in CUSTOMER
 * when there is one (e.g. attaching a booking to the customer's account).
 * Never rejects: no/invalid token or a non-customer simply yields null.
 */
export async function getOptionalCustomer(request: Request): Promise<User | null> {
  try {
    const user = await loadUserFromRequest(request);
    return user && user.role === "CUSTOMER" ? user : null;
  } catch {
    return null;
  }
}
