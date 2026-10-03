import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireOwner, requireSuperAdmin } from "@/lib/server/auth";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import prisma from "@/lib/server/prisma";
import {
  createUploadTarget,
  IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  MIN_UPLOAD_BYTES,
  UPLOAD_KINDS,
} from "@/lib/server/s3";

/**
 * POST /api/uploads - a presigned S3 POST for one image.
 *
 * The salon OWNER uploads for their own salon (workers cannot edit services,
 * barbers or settings, so they have nothing to upload for) (taken from the token, never the
 * body). The platform operator names the salon in `salonId`. Customers cannot
 * upload. The client then POSTs the file straight to S3 and saves the returned
 * `publicUrl` through the normal settings / barber / platform routes, which
 * re-check that the URL belongs to the salon.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  kind: z.enum(UPLOAD_KINDS),
  contentType: z.enum(Object.keys(IMAGE_TYPES) as [keyof typeof IMAGE_TYPES, ...(keyof typeof IMAGE_TYPES)[]]),
  size: z.number().int().min(MIN_UPLOAD_BYTES, "The image is too small.").max(MAX_UPLOAD_BYTES, "Images can be at most 5 MB."),
  salonId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Salon owner first; otherwise the platform operator. The second gate's error is
    // the right one for everyone else (401 without a token, 403 for customers).
    const staff = await requireOwner(request);
    const platform = "error" in staff ? await requireSuperAdmin(request) : null;
    if (platform && "error" in platform) return platform.error;

    const parsed = await parseJsonStrict(request, bodySchema);
    if ("error" in parsed) return parsed.error;
    const { kind, contentType, salonId: requestedSalonId } = parsed.data;

    let salonId: string;
    if (!("error" in staff)) {
      salonId = staff.salonId;
    } else {
      if (!requestedSalonId) {
        return NextResponse.json({ success: false, message: "salonId is required." }, { status: 400 });
      }
      const exists = await prisma.salon.findUnique({ where: { id: requestedSalonId }, select: { id: true } });
      if (!exists) return NextResponse.json({ success: false, message: "Salon not found." }, { status: 404 });
      salonId = exists.id;
    }

    const target = await createUploadTarget({ salonId, kind, contentType });
    return NextResponse.json({ success: true, ...target }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
