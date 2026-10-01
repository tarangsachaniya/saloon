import { NextResponse } from "next/server";

import { requireCustomer } from "@/lib/server/account";
import { accountUser } from "@/lib/server/publicUser";

/** GET /api/account — the signed-in customer's own account. */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ success: true, user: accountUser(auth.user) });
}
