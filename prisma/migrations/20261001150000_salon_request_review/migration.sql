-- Salon request review workflow on PlatformLead (the "List your salon" request).
-- Status mapping (no enum change): NEW/CONTACTED = pending, CONVERTED = approved,
-- DISMISSED = rejected. Every column is nullable, so existing rows are untouched.

-- AlterTable
ALTER TABLE "PlatformLead"
  ADD COLUMN "salonId"         TEXT,
  ADD COLUMN "reviewedAt"      TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "adminSeenAt"     TIMESTAMP(3),
  ADD COLUMN "accessSentAt"    TIMESTAMP(3),
  ADD COLUMN "accessError"     TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PlatformLead_salonId_key" ON "PlatformLead"("salonId");

-- AddForeignKey
ALTER TABLE "PlatformLead" ADD CONSTRAINT "PlatformLead_salonId_fkey"
  FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
