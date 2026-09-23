import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { publicUser } from "@/lib/server/publicUser";

/**
 * GET /api/auth/me — lets the admin app validate a stored token on boot.
 * Port of `loginController.me` behind the `verification` gate.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  return NextResponse.json({ success: true, user: publicUser(user) }, { status: 200 });
}
