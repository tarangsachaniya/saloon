import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Minimal `.env` reader — Vitest, unlike Next.js, does not load one. */
function loadDotEnv(file: string): void {
  const fullPath = path.resolve(rootDir, file);
  if (!fs.existsSync(fullPath)) return;
  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const key = match[1];
    const value = match[2].replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/**
 * Vitest setup for the ported backend tests.
 *
 * Two things need explaining:
 *
 *  1. `server-only` is aliased to an empty stub. Every file under `lib/server/`
 *     imports it so Next.js fails the BUILD if one is ever pulled into a client
 *     bundle — but the real module throws on import anywhere outside a React
 *     Server Component, which would make these tests impossible to run. The
 *     alias applies to tests only; `next build` still uses the real package and
 *     keeps the guarantee.
 *
 *  2. Vitest does not read `.env` the way Next.js does, so it is loaded here.
 *     The integration test talks to the same local `barber_dev` database as the
 *     Express backend did, and the login path needs `JWT_SECRET`.
 */
loadDotEnv(".env.local");
loadDotEnv(".env");

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(rootDir, "test/stubs/server-only.ts"),
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // The double-booking suite hits a real Postgres; the default 5s is tight.
    testTimeout: 45000,
    hookTimeout: 45000,
    // These tests share one database and clean up their own fixtures, so they
    // must not run concurrently with each other.
    fileParallelism: false,
  },
});
