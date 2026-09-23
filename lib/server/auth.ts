import "server-only";

import { NextResponse } from "next/server";
import type { User } from "@prisma/client";

import prisma from "./prisma";
import { validateToken } from "./jwt";

/**
 * Port of `backend/middleware/adminMiddleware.js`.
 *
 * Single-salon auth: one `Authorization: Bearer <token>` header, one User
 * table, two roles. Express middleware becomes two helpers a Route Handler
 * calls explicitly:
 *
 *   const auth = await requireAdmin(request);   // hard gate  (was `verification`)
 *   if ('error' in auth) return auth.error;
 *   const { user } = auth;
 *
 *   const user = await getOptionalUser(request); // soft gate (was `optional`)
 */

export const ALLOWED_ROLES = ["OWNER", "STAFF"] as const;

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

async function loadUserFromRequest(request: Request): Promise<User | null> {
  const token = readBearerToken(request);
  if (!token) return null;

  const decoded = validateToken(token);
  if (!decoded || !decoded.id) return null;

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.enabled || !ALLOWED_ROLES.includes(user.role)) return null;
  return user;
}

export type AdminGate = { user: User } | { error: NextResponse };

/** Hard gate for every admin route. 401s exactly like the Express version. */
export async function requireAdmin(request: Request): Promise<AdminGate> {
  try {
    const user = await loadUserFromRequest(request);
    if (!user) {
      return {
        error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }),
      };
    }
    return { user };
  } catch (error) {
    console.error("[auth] failed to load user:", error);
    return {
      error: NextResponse.json(
        { success: false, message: "Something went wrong." },
        { status: 500 },
      ),
    };
  }
}

/**
 * Soft gate for endpoints that are public but behave differently for staff
 * (e.g. `GET /api/services?includeInactive=true`). Never rejects.
 */
export async function getOptionalUser(request: Request): Promise<User | null> {
  try {
    return await loadUserFromRequest(request);
  } catch {
    return null;
  }
}
