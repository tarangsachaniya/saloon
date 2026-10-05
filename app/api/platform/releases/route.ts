import { NextResponse, type NextRequest } from "next/server";

import { requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import prisma from "@/lib/server/prisma";
import { headApk, isApkKey } from "@/lib/server/s3";
import { createReleaseSchema } from "@/lib/server/validation/releaseValidation";

/**
 * GET  /api/platform/releases - every release, newest first.
 * POST /api/platform/releases - register an APK already uploaded to S3.
 * SUPER_ADMIN only.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;
    const releases = await prisma.appRelease.findMany({ orderBy: { versionCode: "desc" } });
    return NextResponse.json({ success: true, releases });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonStrict(request, createReleaseSchema);
    if ("error" in parsed) return parsed.error;
    const data = parsed.data;

    if (!isApkKey(data.apkKey)) {
      return NextResponse.json({ success: false, message: "Unknown APK upload." }, { status: 400 });
    }
    const latest = await prisma.appRelease.findFirst({ orderBy: { versionCode: "desc" }, select: { versionCode: true } });
    if (latest && data.versionCode <= latest.versionCode) {
      return NextResponse.json(
        { success: false, message: `Version code must be greater than the latest release (${latest.versionCode}).` },
        { status: 409 },
      );
    }
    const object = await headApk(data.apkKey);
    if (!object) {
      return NextResponse.json({ success: false, message: "The APK was not found in storage. Upload it again." }, { status: 400 });
    }

    const release = await prisma.appRelease.create({
      data: {
        versionCode: data.versionCode,
        versionName: data.versionName,
        apkKey: data.apkKey,
        apkUrl: object.publicUrl,
        sizeBytes: object.sizeBytes,
        sha256: data.sha256.toLowerCase(),
        notes: data.notes || null,
        mandatory: data.mandatory,
      },
    });
    return NextResponse.json({ success: true, release }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
