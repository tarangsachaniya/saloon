import { NextResponse } from "next/server";

import prisma from "@/lib/server/prisma";
import { requireCustomer } from "@/lib/server/account";
import { handleRouteError, parseJsonStrict } from "@/lib/server/http";
import { accountUser } from "@/lib/server/publicUser";
import { profileSchema } from "@/lib/validation/account";

/**
 * PATCH /api/account/profile { name, email, phone }
 *
 * Updates ONLY the caller's own row: the id comes from the token, and the body
 * is parsed through a schema that has no id/role/salonId (unknown keys are
 * dropped), so none of those can be changed here.
 */

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const auth = await requireCustomer(request);
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonStrict(request, profileSchema);
    if ("error" in parsed) return parsed.error;
    const { name, phone } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const [firstName, ...rest] = name.split(/\s+/);
    try {
      const user = await prisma.user.update({
        where: { id: auth.user.id },
        data: { firstName, lastName: rest.join(" ") || null, email, phoneNumber: phone },
      });
      return NextResponse.json({ success: true, user: accountUser(user) });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            message: "Email already in use.",
            fieldErrors: { email: "Email already in use." },
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
