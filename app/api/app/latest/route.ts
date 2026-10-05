import { NextResponse, type NextRequest } from "next/server";

import { handleRouteError } from "@/lib/server/http";
import prisma from "@/lib/server/prisma";
import { pickUpdate } from "@/lib/server/releases";

/**
 * GET /api/app/latest?versionCode=N - public. Tells an installed app whether a
 * newer active release exists and whether installing it is mandatory.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("versionCode");
    const installed = raw === null ? NaN : Number.parseInt(raw, 10);
    if (!Number.isInteger(installed) || installed < 0) {
      return NextResponse.json({ success: false, message: "versionCode is required." }, { status: 400 });
    }
    const releases = await prisma.appRelease.findMany({
      where: { isActive: true, versionCode: { gt: installed } },
      select: { versionCode: true, versionName: true, apkUrl: true, sizeBytes: true, sha256: true, notes: true, mandatory: true },
    });
    return NextResponse.json({ success: true, ...pickUpdate(releases, installed) });
  } catch (error) {
    return handleRouteError(error);
  }
}
