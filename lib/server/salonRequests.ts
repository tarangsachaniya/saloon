import "server-only";

import type { PlatformLead } from "@prisma/client";

/**
 * Salon listing requests = `PlatformLead` rows from the public "List your salon"
 * form. They are leads only: the team reviews and contacts the person manually.
 * Nothing here approves, activates, creates an account or issues credentials.
 */

export function serializeRequest(lead: PlatformLead) {
  return {
    id: lead.id,
    ownerName: lead.name,
    salonName: lead.salonName,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    message: lead.message,
    createdAt: lead.createdAt,
    /** True until an admin opens the request: the "new request" notification. */
    isNew: lead.adminSeenAt === null,
  };
}
