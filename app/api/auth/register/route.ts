import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { hashSync } from "@/lib/server/password";
import { generateToken } from "@/lib/server/jwt";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { publicUser } from "@/lib/server/publicUser";
import { registerSchema } from "@/lib/validation/auth";

/**
 * POST /api/auth/register — public customer sign-up.
 *
 * The role is hard-coded to CUSTOMER and the body is never read for it (zod
 * strips unknown keys, so a smuggled `role`/`salonId` is dropped): OWNER and
 * SUPER_ADMIN accounts are only ever created by the platform/seed processes.
 * Logs the new customer straight in, matching /api/auth/login's response.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonStrict(request, registerSchema);
    if ("error" in parsed) return parsed.error;
    const { name, phone, password } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const [firstName, ...rest] = name.split(/\s+/);
    const lastName = rest.join(" ") || null;

    try {
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          phoneNumber: phone,
          password: hashSync(password),
          role: "CUSTOMER",
        },
      });
      const token = generateToken({ id: user.id, role: user.role, salonId: null });
      return NextResponse.json(
        { success: true, token, user: publicUser(user, null) },
        { status: 201 },
      );
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            message: "An account with this email already exists.",
            fieldErrors: { email: "This email is already registered." },
          },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
