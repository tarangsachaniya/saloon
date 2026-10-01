import "server-only";

import { randomBytes } from "node:crypto";
import type { LeadStatus, PlatformLead, Salon } from "@prisma/client";

import { generateTokenForForgot } from "./jwt";
import { sendSalonAccessMail } from "./mail";
import { createSalonWithOwner, PlatformConflictError } from "./platform";
import prisma from "./prisma";
import type { BillingPlanInput } from "./validation/platformValidation";

/**
 * Salon requests = `PlatformLead` rows from the public "List your salon" form.
 *
 *   PENDING  (NEW / CONTACTED)  -> APPROVED (CONVERTED)  salon + OWNER created
 *                               -> REJECTED (DISMISSED)  nothing created
 *
 * Both transitions claim the row with a conditional UPDATE inside the same
 * transaction that creates the salon, so double clicks, retries and two admins
 * at once can only ever succeed once.
 */

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AccessDelivery = "sent" | "not_configured" | "failed" | "not_sent";

const PENDING_STATUSES: LeadStatus[] = ["NEW", "CONTACTED"];

export function requestStatus(status: LeadStatus): RequestStatus {
  if (status === "CONVERTED") return "APPROVED";
  if (status === "DISMISSED") return "REJECTED";
  return "PENDING";
}

export function statusesFor(status: RequestStatus): LeadStatus[] {
  return status === "PENDING" ? PENDING_STATUSES : status === "APPROVED" ? ["CONVERTED"] : ["DISMISSED"];
}

type LeadWithSalon = PlatformLead & { salon?: Pick<Salon, "id" | "slug" | "name"> | null };

function deliveryOf(lead: PlatformLead): AccessDelivery {
  if (lead.status !== "CONVERTED") return "not_sent";
  if (lead.accessSentAt) return "sent";
  if (!lead.accessError) return "not_sent";
  return lead.accessError === NOT_CONFIGURED ? "not_configured" : "failed";
}

export function serializeRequest(lead: LeadWithSalon) {
  return {
    id: lead.id,
    status: requestStatus(lead.status),
    ownerName: lead.name,
    salonName: lead.salonName,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    message: lead.message,
    createdAt: lead.createdAt,
    reviewedAt: lead.reviewedAt,
    rejectionReason: lead.rejectionReason,
    isNew: lead.adminSeenAt === null && requestStatus(lead.status) === "PENDING",
    salon: lead.salon ? { id: lead.salon.id, slug: lead.salon.slug, name: lead.salon.name } : null,
    access: { delivery: deliveryOf(lead), sentAt: lead.accessSentAt },
  };
}

const NOT_CONFIGURED = "Email is not configured on the server.";
const FAILED = "Email delivery failed.";

/** Fresh sign-in URL the owner uses to set their password (same mechanism as "Forgot password"). */
function activationLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}

/** Sends the access email and records the outcome on the request. Never throws. */
async function deliverAccess(
  leadId: string,
  input: { to: string; salonName: string; ownerName: string; link: string },
): Promise<AccessDelivery> {
  try {
    const result = await sendSalonAccessMail(input);
    if (result.status === "sent") {
      await prisma.platformLead.update({ where: { id: leadId }, data: { accessSentAt: new Date(), accessError: null } });
      return "sent";
    }
    await prisma.platformLead.update({ where: { id: leadId }, data: { accessSentAt: null, accessError: NOT_CONFIGURED } });
    return "not_configured";
  } catch (error) {
    console.error("[salon-request] access email failed:", error instanceof Error ? error.message : "unknown");
    await prisma.platformLead
      .update({ where: { id: leadId }, data: { accessSentAt: null, accessError: FAILED } })
      .catch(() => undefined);
    return "failed";
  }
}

async function uniqueSlug(base: string): Promise<string> {
  const root = base.replace(/^-+|-+$/g, "").slice(0, 50) || "salon";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    if (!(await prisma.salon.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
  return `${root}-${randomBytes(3).toString("hex")}`;
}

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function splitName(full: string): { firstName: string; lastName: string | null } {
  const [firstName, ...rest] = full.trim().split(/\s+/);
  return { firstName: firstName || "Owner", lastName: rest.join(" ") || null };
}

async function explainNotPending(id: string): Promise<never> {
  const current = await prisma.platformLead.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw new RequestNotFoundError();
  throw new PlatformConflictError(
    requestStatus(current.status) === "APPROVED"
      ? "This request has already been approved."
      : "This request has already been rejected.",
  );
}

export class RequestNotFoundError extends Error {
  status = 404;
  expose = true;
  constructor() {
    super("Salon request not found.");
  }
}

/**
 * Approve: claim the request, create the salon + OWNER login + billing plan, and
 * store a one-time activation token, all in ONE transaction; then email the
 * activation link. Email trouble never undoes the approval: it is reported so
 * the admin can resend or share the link.
 */
export async function approveRequest(
  id: string,
  input: { plan: BillingPlanInput; slug?: string; ownerEmail?: string },
  origin: string,
) {
  const lead = await prisma.platformLead.findUnique({ where: { id } });
  if (!lead) throw new RequestNotFoundError();
  if (!PENDING_STATUSES.includes(lead.status)) return explainNotPending(id);

  const ownerEmail = (input.ownerEmail ?? lead.email).trim().toLowerCase();
  const slug = input.slug ? input.slug : await uniqueSlug(slugFromName(lead.salonName));
  const { firstName, lastName } = splitName(lead.name);

  const created = await prisma.$transaction(
    async (tx) => {
      const claimed = await tx.platformLead.updateMany({
        where: { id, status: { in: PENDING_STATUSES } },
        data: { status: "CONVERTED", reviewedAt: new Date(), rejectionReason: null, adminSeenAt: lead.adminSeenAt ?? new Date() },
      });
      if (claimed.count === 0) return null; // somebody else got there first

      // Throws PlatformConflictError (rolling everything back, the request stays
      // pending) if the slug or the owner's email is already taken. An existing
      // account is never reused, re-roled or modified.
      const { salon } = await createSalonWithOwner(
        {
          salon: {
            name: lead.salonName,
            slug,
            tagline: null,
            about: null,
            phone: lead.phone,
            email: lead.email,
            address: lead.city,
            theme: "SPA",
            accentColor: null,
          },
          owner: { firstName, lastName, email: ownerEmail, phoneNumber: lead.phone },
          plan: input.plan,
        },
        // Unusable until the owner sets their own through the activation link.
        { db: tx, password: randomBytes(32).toString("hex") },
      );
      const owner = salon.users[0];
      const token = generateTokenForForgot({ id: owner.id, email: owner.email }, "7d");
      await tx.user.update({ where: { id: owner.id }, data: { passToken: token } });
      await tx.platformLead.update({ where: { id }, data: { salonId: salon.id } });
      return { salon, owner, token };
    },
    { timeout: 20_000 },
  );
  if (!created) return explainNotPending(id);

  const link = activationLink(origin, created.token);
  const delivery = await deliverAccess(id, {
    to: created.owner.email,
    salonName: created.salon.name,
    ownerName: firstName,
    link,
  });
  const fresh = await prisma.platformLead.findUniqueOrThrow({ where: { id }, include: { salon: { select: { id: true, slug: true, name: true } } } });
  return { request: serializeRequest(fresh), delivery, activationLink: link };
}

export async function rejectRequest(id: string, reason: string | null) {
  const claimed = await prisma.platformLead.updateMany({
    where: { id, status: { in: PENDING_STATUSES } },
    data: { status: "DISMISSED", reviewedAt: new Date(), rejectionReason: reason, adminSeenAt: new Date() },
  });
  if (claimed.count === 0) return explainNotPending(id);
  const fresh = await prisma.platformLead.findUniqueOrThrow({ where: { id } });
  return serializeRequest(fresh);
}

/**
 * Re-issue access for an approved request whose owner hasn't activated yet.
 * Creates no user: it replaces the owner's one-time token (invalidating the old
 * link) and sends it again.
 */
export async function resendAccess(id: string, origin: string) {
  const lead = await prisma.platformLead.findUnique({ where: { id } });
  if (!lead) throw new RequestNotFoundError();
  if (lead.status !== "CONVERTED" || !lead.salonId) {
    throw new PlatformConflictError("Only an approved request has account access to resend.");
  }
  const owner = await prisma.user.findFirst({
    where: { salonId: lead.salonId, role: "OWNER" },
    orderBy: { createdAt: "asc" },
  });
  if (!owner) throw new PlatformConflictError("This salon has no owner login.");
  if (!owner.passToken) {
    throw new PlatformConflictError("The owner has already set a password. They can use “Forgot password” if needed.");
  }

  const token = generateTokenForForgot({ id: owner.id, email: owner.email }, "7d");
  await prisma.user.update({ where: { id: owner.id }, data: { passToken: token } });
  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: lead.salonId }, select: { name: true } });
  const link = activationLink(origin, token);
  const delivery = await deliverAccess(id, {
    to: owner.email,
    salonName: salon.name,
    ownerName: owner.firstName,
    link,
  });
  const fresh = await prisma.platformLead.findUniqueOrThrow({ where: { id }, include: { salon: { select: { id: true, slug: true, name: true } } } });
  return { request: serializeRequest(fresh), delivery, activationLink: link };
}
