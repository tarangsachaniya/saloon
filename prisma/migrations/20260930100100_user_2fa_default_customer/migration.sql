-- Phase 1 auth foundation, step 2: TOTP 2FA columns + least-privilege default role.
-- Every existing insert path (seeds, platform.ts) sets `role` explicitly, so the
-- default only affects future public registrations.

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoFactorSecret"  TEXT,
  ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
