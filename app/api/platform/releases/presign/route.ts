import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/http";
import { createApkUploadTarget } from "@/lib/server/s3";

/** POST /api/platform/releases/presign - a presigned S3 POST for one APK. SUPER_ADMIN only. */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;
    const target = await createApkUploadTarget();
    return NextResponse.json({ success: true, ...target });
  } catch (error) {
    return handleRouteError(error);
  }
}
