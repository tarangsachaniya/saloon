import "server-only";

import type { User } from "@prisma/client";

/**
 * The only User fields that ever leave the server.
 * `salonSlug` lets the client send an OWNER/STAFF to their shop page and label
 * the dashboard; it is null for a SUPER_ADMIN.
 */
export function publicUser(user: User, salon?: { slug: string; name: string } | null) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    salonId: user.salonId,
    salonSlug: salon?.slug ?? null,
    salonName: salon?.name ?? null,
  };
}
