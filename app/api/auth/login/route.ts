import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { comSync } from "@/lib/server/password";
import { generateToken } from "@/lib/server/jwt";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { loginBodySchema } from "@/lib/server/validation/userValidation";
import { publicUser } from "@/lib/server/publicUser";

/**
 * POST /api/auth/login — admin/staff authentication.
 *
 * Port of `loginController.login`.
 *
 * RATE LIMITING IS NOT CARRIED OVER. The Express app wrapped this one route in
 * `express-rate-limit` (10 minute window, 20 requests). That middleware keeps
 * its counters in the process's memory, which means nothing in a serverless
 * deployment where every request may hit a fresh instance. A correct
 * replacement needs shared external state (Vercel KV / Upstash / a Postgres
 * counter), i.e. a new dependency and a new piece of infrastructure — out of
 * scope for this consolidation. See `.migration-report-consolidation.md`;
 * re-adding a brute-force guard here is a tracked follow-up.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody<{ email?: unknown; password?: unknown }>(
      request,
      loginBodySchema,
    );
    if ("error" in parsed) return parsed.error;

    const email = String(parsed.body.email || "").trim().toLowerCase();
    const password = String(parsed.body.password || "");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !comSync(password, user.password)) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials." },
        { status: 401 },
      );
    }
    if (!user.enabled) {
      return NextResponse.json(
        { success: false, message: "This account is disabled." },
        { status: 403 },
      );
    }

    const salon = user.salonId
      ? await prisma.salon.findUnique({
          where: { id: user.salonId },
          select: { slug: true, name: true, isActive: true },
        })
      : null;
    if (user.role !== "SUPER_ADMIN" && (!salon || !salon.isActive)) {
      return NextResponse.json(
        { success: false, message: "This salon is not active." },
        { status: 403 },
      );
    }

    // `salonId` in the token is informational only: every request re-reads the
    // user row, which is the source of truth for tenancy (see `auth.ts`).
    const token = generateToken({ id: user.id, role: user.role, salonId: user.salonId });
    return NextResponse.json(
      { success: true, token, user: publicUser(user, salon) },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
