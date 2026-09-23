import "server-only";

import prisma from "./prisma";

/**
 * Port of `upsertClientByPhone` from `backend/controller/clientController.js`.
 *
 * Clients are the salon's CRM records. They are never created through a public
 * route - this is called from the booking flow, which de-duplicates repeat
 * customers on their phone number: one client row per phone number, and
 * re-booking under a new name/email updates the existing record.
 */
export async function upsertClientByPhone(
  { name, phone, email }: { name: unknown; phone: unknown; email?: unknown },
  tx: Pick<typeof prisma, "client"> = prisma,
) {
  const cleanPhone = String(phone).trim();
  const cleanName = String(name).trim();
  const cleanEmail = email ? String(email).trim() : null;

  return tx.client.upsert({
    where: { phone: cleanPhone },
    update: { name: cleanName, ...(cleanEmail ? { email: cleanEmail } : {}) },
    create: { name: cleanName, phone: cleanPhone, email: cleanEmail },
  });
}
