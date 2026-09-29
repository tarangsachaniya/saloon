-- "List your salon" enquiries from the marketing site. Additive, hand-written
-- (a generated diff would drop the Prisma-invisible Appointment.slotRange).

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "PlatformLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "salonName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformLead_status_createdAt_idx" ON "PlatformLead"("status", "createdAt");
