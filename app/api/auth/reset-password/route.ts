import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { inspectToken, validateToken } from "@/lib/server/jwt";
import { passwordSchema } from "@/lib/validation/auth";
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
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, code: "TOKEN_INVALID", message: "This reset link is invalid." },
        { status: 400 },
      );
    }

    // Token first, so a bad link is reported as such rather than as a weak password.
    const state = inspectToken(token);
    const decoded = state === "valid" ? validateToken(token) : null;
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        {
          success: false,
          code: state === "expired" ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
          message:
            state === "expired"
              ? "This reset link has expired. Request a new one."
              : "This reset link is invalid.",
        },
        { status: 400 },
      );
    }

    const passwordCheck = passwordSchema.safeParse(password);
    if (!passwordCheck.success) {
      return NextResponse.json(
        {
          success: false,
          code: "WEAK_PASSWORD",
          message: passwordCheck.error.issues[0]?.message ?? "Password is too weak.",
          fieldErrors: { password: passwordCheck.error.issues[0]?.message },
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.passToken !== token) {
      return NextResponse.json(
        {
          success: false,
          code: "TOKEN_INVALID",
          message: "This reset link is invalid or has already been used.",
        },
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
