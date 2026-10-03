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
    /** STAFF with their own login: the worker they are. */
    barberId: user.barberId,
    salonSlug: salon?.slug ?? null,
    salonName: salon?.name ?? null,
  };
}

/**
 * What a customer sees about their own account (`/api/account`). Still no
 * password hash or internal-only columns.
 */
export function accountUser(user: User) {
  return {
    ...publicUser(user),
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    phone: user.phoneNumber,
    status: user.enabled ? "Active" : "Disabled",
    memberSince: user.createdAt.toISOString(),
  };
}
