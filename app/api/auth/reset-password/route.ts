import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { validateToken } from "@/lib/server/jwt";
import { hashSync } from "@/lib/server/password";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";

/**
 * POST /api/auth/reset-password  body: { token, password }
 * Port of `loginController.resetPassword`.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody<{ token?: string; password?: string }>(request);
    if ("error" in parsed) return parsed.error;

    const { token, password } = parsed.body;
    if (!token || !password || String(password).length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid token and a password of at least 8 characters are required.",
        },
        { status: 400 },
      );
    }

    const decoded = validateToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { success: false, message: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.passToken !== token) {
      return NextResponse.json(
        { success: false, message: "This reset link is invalid or has already been used." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashSync(String(password)), passToken: null },
    });

    return NextResponse.json(
      { success: true, message: "Password updated. You can now sign in." },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
