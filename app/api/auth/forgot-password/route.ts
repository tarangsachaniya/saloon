import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { generateTokenForForgot } from "@/lib/server/jwt";
import { sendForgotPasswordMail } from "@/lib/server/mail";
import { handleRouteError, parseJsonBody } from "@/lib/server/http";

/**
 * POST /api/auth/forgot-password
 *
 * Port of `loginController.forgotPassword`. Always answers 200 so the endpoint
 * cannot be used to enumerate accounts. The issued token is stored on the user
 * so it can only be redeemed once.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody<{ email?: unknown }>(request);
    if ("error" in parsed) return parsed.error;

    const email = String(parsed.body.email || "").trim().toLowerCase();
    const genericResponse = {
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    };
    if (!email) return NextResponse.json(genericResponse, { status: 200 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.enabled) {
      const token = generateTokenForForgot({ id: user.id, email: user.email });
      await prisma.user.update({ where: { id: user.id }, data: { passToken: token } });
      try {
        await sendForgotPasswordMail(user.email, token);
      } catch (mailError) {
        console.error(
          "[mail] password reset failed:",
          mailError instanceof Error ? mailError.message : mailError,
        );
      }
    }
    return NextResponse.json(genericResponse, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
