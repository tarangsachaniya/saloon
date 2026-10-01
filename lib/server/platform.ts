import "server-only";

import { randomInt } from "node:crypto";
import type { Prisma, PrismaClient, SalonBillingPlan } from "@prisma/client";

import { hashSync } from "./password";
import prisma from "./prisma";
import type { BillingPlanInput, CreateSalonInput } from "./validation/platformValidation";

/**
 * Platform-operator (SUPER_ADMIN) services: creating salons with their owner
 * account and billing plan, and reading plans. Route handlers stay thin.
 */

/** Ambiguity-free alphabet (no 0/O, 1/l/I) for passwords read off a screen. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A one-time password the owner is told to change after first sign-in. */
export function generateTemporaryPassword(length = 14): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Mon-Sat 10:00-20:00, Sunday closed: a sensible starting week to edit. */
const DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  isOpen: weekday !== 0,
  openTime: 600,
  closeTime: 1200,
}));

export function planData(plan: BillingPlanInput) {
  return plan.planType === "MONTHLY"
    ? { planType: "MONTHLY" as const, monthlyFee: plan.monthlyFee, commissionType: null, commissionValue: null }
    : {
        planType: "COMMISSION" as const,
        monthlyFee: null,
        commissionType: plan.commissionType,
        commissionValue: plan.commissionValue,
      };
}

export class PlatformConflictError extends Error {
  status = 409;
  expose = true;
}

/**
 * Creates the salon, its booking settings, a default week of hours, its first
 * billing plan and its OWNER login, all in one transaction. Returns the
 * temporary password exactly once; only its hash is stored.
 *
 * `opts.db` lets a caller run this inside its own transaction (salon-request
 * approval); `opts.password` sets the owner's initial password instead of
 * generating a displayed temporary one.
 */
export async function createSalonWithOwner(
  input: CreateSalonInput,
  opts: { db?: Prisma.TransactionClient | PrismaClient; password?: string } = {},
) {
  const db = opts.db ?? prisma;
  const ownerEmail = input.owner.email.trim().toLowerCase();

  const [slugTaken, emailTaken] = await Promise.all([
    db.salon.findUnique({ where: { slug: input.salon.slug }, select: { id: true } }),
    db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } }),
  ]);
  if (slugTaken) throw new PlatformConflictError(`The address /s/${input.salon.slug} is already taken.`);
  if (emailTaken) throw new PlatformConflictError(`A user with the email ${ownerEmail} already exists.`);

  const temporaryPassword = opts.password ?? generateTemporaryPassword();
  const s = input.salon;

  const salon = await db.salon.create({
    data: {
      slug: s.slug,
      name: s.name,
      tagline: s.tagline || null,
      about: s.about || null,
      phone: s.phone || null,
      email: s.email || null,
      address: s.address || null,
      theme: s.theme,
      accentColor: s.accentColor ? s.accentColor.toLowerCase() : null,
      settings: { create: {} },
      openingHours: { create: DEFAULT_HOURS },
      billingPlans: { create: planData(input.plan) },
      users: {
        create: {
          firstName: input.owner.firstName,
          lastName: input.owner.lastName || null,
          email: ownerEmail,
          phoneNumber: input.owner.phoneNumber || null,
          password: hashSync(temporaryPassword),
          role: "OWNER",
          enabled: true,
        },
      },
    },
    include: SALON_DETAIL_INCLUDE,
  });

  return { salon, credentials: { email: ownerEmail, temporaryPassword } };
}

export const SALON_DETAIL_INCLUDE = {
  billingPlans: { orderBy: { effectiveFrom: "desc" } },
  users: {
    where: { role: { in: ["OWNER", "STAFF"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, enabled: true, createdAt: true },
  },
} satisfies Prisma.SalonInclude;

/** The plan in force at `at`: the latest one whose `effectiveFrom` has passed. */
export function currentPlan<T extends Pick<SalonBillingPlan, "effectiveFrom">>(plans: T[], at = new Date()): T | null {
  let best: T | null = null;
  for (const p of plans) {
    if (p.effectiveFrom <= at && (!best || p.effectiveFrom > best.effectiveFrom)) best = p;
  }
  return best;
}

/** Human summary: "₹2,500 / month", "12.5% of completed bookings", "₹50 per completed booking". */
export function describePlan(p: {
  planType: string;
  monthlyFee: Prisma.Decimal | number | null;
  commissionType: string | null;
  commissionValue: Prisma.Decimal | number | null;
}): string {
  const inr = (v: Prisma.Decimal | number | null) =>
    `₹${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  if (p.planType === "MONTHLY") return `${inr(p.monthlyFee)} / month`;
  if (p.commissionType === "PERCENT") return `${Number(p.commissionValue)}% of completed bookings`;
  return `${inr(p.commissionValue)} per completed booking`;
}
