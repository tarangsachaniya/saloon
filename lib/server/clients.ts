import "server-only";

import prisma from "./prisma";

const PHONE_LIKE = /^\+?[0-9\s\-().]+$/;

/**
 * Digits with an optional leading "+": "+91 98765-43210" and "+919876543210" are
 * one number. Anything that isn't phone-shaped is left as typed (trimmed) rather
 * than mangled into a different string.
 */
export function normalizePhone(phone: unknown): string {
  const raw = String(phone).trim();
  if (!PHONE_LIKE.test(raw)) return raw;
  return (raw.startsWith("+") ? "+" : "") + raw.replace(/\D/g, "");
}

/**
 * Find-or-create the salon's CRM record for a booking's phone number.
 *
 * Clients are never created through a public route - this is called from the
 * booking flow, which de-duplicates repeat customers on their phone: one row per
 * (salon, phone).
 *
 * The booking endpoint is unauthenticated, so an existing record is NEVER
 * rewritten from it: anyone who knew a customer's number could otherwise
 * rename them or swap their email in the salon's CRM. A repeat booking keeps
 * the stored name; the email is only filled in if the record has none. The
 * appointment itself does not depend on the name, and staff can edit the client
 * from the dashboard.
 *
 * Numbers are matched on their normalised form (and the raw spelling, for rows
 * saved before normalisation) so formatting differences don't split a customer
 * into duplicates.
 */
export async function upsertClientByPhone(
  { salonId, name, phone, email }: { salonId: string; name: unknown; phone: unknown; email?: unknown },
  tx: Pick<typeof prisma, "client"> = prisma,
) {
  const rawPhone = String(phone).trim();
  const cleanPhone = normalizePhone(phone);
  const cleanName = String(name).trim();
  const cleanEmail = email ? String(email).trim() : null;

  const existing = await tx.client.findFirst({
    where: { salonId, phone: { in: [...new Set([cleanPhone, rawPhone])] } },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    if (!existing.email && cleanEmail) {
      return tx.client.update({ where: { id: existing.id }, data: { email: cleanEmail } });
    }
    return existing;
  }

  try {
    return await tx.client.create({
      data: { salonId, name: cleanName, phone: cleanPhone, email: cleanEmail },
    });
  } catch (error) {
    // Two simultaneous first bookings from one number: the loser re-reads.
    if ((error as { code?: string }).code === "P2002") {
      return tx.client.findFirstOrThrow({ where: { salonId, phone: cleanPhone } });
    }
    throw error;
  }
}
