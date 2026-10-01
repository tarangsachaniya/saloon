import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { CONSENT_VERSION } from "@/lib/legal/versions";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { sendAdminNewRequestMail } from "@/lib/server/mail";
import prisma from "@/lib/server/prisma";

/**
 * POST /api/contact — a "list your salon" enquiry from the marketing site.
 *
 * Public and unauthenticated, so it is defended in depth without a shared rate
 * limiter (none exists in this app yet, see the note in `auth/login/route.ts`):
 *   - strict zod validation and length caps,
 *   - a honeypot field (`website`) that real users never fill: bots get a
 *     success response and nothing is stored,
 *   - the same email may only submit once every 10 minutes (DB check).
 * Consent to be contacted is mandatory and stored with its version.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  salonName: z.string().trim().min(2).max(160),
  email: z.email().max(180),
  phone: z.string().trim().max(30).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  consent: z.literal(true),
  website: z.string().max(200).optional(), // honeypot
});

const THROTTLE_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody<z.infer<typeof bodySchema>>(request, bodySchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.body;

    // Honeypot tripped: pretend it worked, store nothing.
    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const email = body.email.trim().toLowerCase();
    const recent = await prisma.platformLead.count({
      where: { email, createdAt: { gte: new Date(Date.now() - THROTTLE_MS) } },
    });
    if (recent > 0) {
      return NextResponse.json(
        { success: false, message: "We already have your request: we'll be in touch shortly." },
        { status: 429 },
      );
    }

    const lead = await prisma.platformLead.create({
      data: {
        name: body.name,
        salonName: body.salonName,
        email,
        phone: body.phone || null,
        city: body.city || null,
        message: body.message || null,
        consentAt: new Date(),
        consentVersion: CONSENT_VERSION,
      },
    });

    // The stored request IS the admin notification (shown as "new" in the platform
    // admin until opened). The email heads-up is best effort and only sent once the
    // request is safely stored; its failure never fails the submission.
    void sendAdminNewRequestMail({
      salonName: lead.salonName,
      ownerName: lead.name,
      city: lead.city,
      link: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/platform/requests`,
    }).catch((error) =>
      console.error("[mail] admin notification failed:", error instanceof Error ? error.message : "unknown"),
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
