import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";

/**
 * GET /api/health
 *
 * Port of the Express app's `GET /health` liveness probe. Mounted under `/api`
 * here so the whole server surface lives in one place (Next.js owns `/` for
 * pages). Same behaviour: round-trip the database, 200 when it answers.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error(
      "[health] database check failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { status: "error", message: "Database unavailable" },
      { status: 500 },
    );
  }
}
