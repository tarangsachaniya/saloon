import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Shared PrismaClient singleton.
 *
 * Port of `backend/lib/prisma.js`. The global cache is what stops Next.js's
 * dev-mode module reloading from opening a new pool on every edit and
 * exhausting Postgres connections — the same reason the Express app cached it
 * across nodemon restarts.
 *
 * In production each serverless instance gets exactly one client for its
 * lifetime, which is what we want.
 */

/**
 * Worker commission is internal: `omit` hides it from EVERY query (including
 * nested `include: { barber: true }` on public booking responses) unless a
 * query explicitly opts in with `omit: { commissionPercentage: false }`. Only
 * the owner-only commission code does that, so a new route can never leak it
 * by forgetting to strip a field.
 */
function createClient() {
  return new PrismaClient({ omit: { barber: { commissionPercentage: true } } });
}

const globalForPrisma = globalThis as unknown as {
  __prisma?: ReturnType<typeof createClient>;
};

export const prisma = globalForPrisma.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
