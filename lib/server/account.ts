import "server-only";

import { NextResponse } from "next/server";
import type { User } from "@prisma/client";

import { requireUser } from "./auth";

/**
 * Gate for `/api/account/*`. The user comes ONLY from the verified bearer
 * token (never from the URL or body), so every handler can act on `user.id`
 * and there is no way to address another account. Customers only: staff and
 * the platform operator have their own areas.
 */
export async function requireCustomer(request: Request): Promise<{ user: User } | { error: NextResponse }> {
  const auth = await requireUser(request);
  if ("error" in auth) return auth;
  if (auth.user.role !== "CUSTOMER") {
    return { error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { user: auth.user };
}
