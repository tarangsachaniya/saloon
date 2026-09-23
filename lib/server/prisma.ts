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

const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
