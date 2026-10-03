import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import prisma from "@/lib/server/prisma";
import { requireOwner } from "@/lib/server/auth";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";
import { hashSync } from "@/lib/server/password";
import { generateTemporaryPassword } from "@/lib/server/platform";

/**
 * A worker's own login, managed by the salon OWNER only.
 *
 *   GET   -> { login: { id, email, firstName, enabled } | null }
 *   POST  { email, firstName? } -> creates a STAFF user linked to this worker;
 *         returns a temporary password ONCE (email is not sent; show it).
 *   PATCH { enabled?: boolean, resetPassword?: true } -> disable / re-enable,
 *         or issue a new temporary password (returned once).
 *
 * A linked worker records walk-ins only as themselves and sees only their own
 * earnings (see walkIns.ts and /api/dashboard/my-earnings).
 */

export const dynamic = "force-dynamic";

const LOGIN_SELECT = { id: true, email: true, firstName: true, enabled: true } as const;

async function ownBarber(id: string, salonId: string) {
  return prisma.barber.findFirst({ where: { id, salonId }, select: { id: true, name: true } });
}

const notFound = () => NextResponse.json({ success: false, message: "Worker not found." }, { status: 404 });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOwner(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    if (!(await ownBarber(id, auth.salonId))) return notFound();
    const login = await prisma.user.findFirst({ where: { barberId: id, salonId: auth.salonId }, select: LOGIN_SELECT });
    return NextResponse.json({ success: true, login });
  } catch (error) {
    return handleRouteError(error);
  }
}

const createSchema = z.object({
  email: z.email().max(180),
  firstName: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOwner(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const barber = await ownBarber(id, auth.salonId);
    if (!barber) return notFound();

    const parsed = await parseJsonBody<{ email: string; firstName?: string }>(request, createSchema);
    if ("error" in parsed) return parsed.error;
    const email = parsed.body.email.trim().toLowerCase();

    if (await prisma.user.findFirst({ where: { barberId: id }, select: { id: true } })) {
      return NextResponse.json({ success: false, message: "This worker already has a login." }, { status: 409 });
    }
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      return NextResponse.json({ success: false, message: "That email is already used by another account." }, { status: 409 });
    }

    const temporaryPassword = generateTemporaryPassword();
    const login = await prisma.user.create({
      data: {
        firstName: parsed.body.firstName?.trim() || barber.name,
        email,
        password: hashSync(temporaryPassword),
        role: "STAFF",
        salonId: auth.salonId,
        barberId: id,
        enabled: true,
      },
      select: LOGIN_SELECT,
    });
    return NextResponse.json({ success: true, login, credentials: { email, temporaryPassword } }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

const patchSchema = z
  .object({ enabled: z.boolean().optional(), resetPassword: z.literal(true).optional() })
  .refine((d) => d.enabled !== undefined || d.resetPassword, { message: "Nothing to update" });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOwner(request);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    if (!(await ownBarber(id, auth.salonId))) return notFound();

    const parsed = await parseJsonBody<{ enabled?: boolean; resetPassword?: true }>(request, patchSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await prisma.user.findFirst({ where: { barberId: id, salonId: auth.salonId }, select: { id: true, email: true } });
    if (!existing) return NextResponse.json({ success: false, message: "This worker has no login yet." }, { status: 404 });

    const temporaryPassword = parsed.body.resetPassword ? generateTemporaryPassword() : null;
    const login = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(parsed.body.enabled !== undefined ? { enabled: parsed.body.enabled } : {}),
        ...(temporaryPassword ? { password: hashSync(temporaryPassword), passToken: null } : {}),
      },
      select: LOGIN_SELECT,
    });
    return NextResponse.json({
      success: true,
      login,
      ...(temporaryPassword ? { credentials: { email: existing.email, temporaryPassword } } : {}),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
