-- Multi-salon tenancy. Hand-assembled from `prisma migrate diff`, with two deliberate changes:
-- 1. `Appointment.slotRange` (generated tsrange behind the double-booking EXCLUDE constraint,
--    invisible to Prisma) is NOT dropped.
-- 2. Existing single-salon data is backfilled into a default 'classic-cuts' salon before
--    salonId becomes NOT NULL.

-- CreateEnum
CREATE TYPE "BillingPlanType" AS ENUM ('MONTHLY', 'COMMISSION');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENT', 'FLAT');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('TERMS', 'PRIVACY', 'CANCELLATION', 'CONSENT');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "about" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "gallery" TEXT[],
    "accentColor" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "mapUrl" TEXT,
    "socials" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonBillingPlan" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "planType" "BillingPlanType" NOT NULL,
    "monthlyFee" DECIMAL(10,2),
    "commissionType" "CommissionType",
    "commissionValue" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonBillingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingStatement" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "planSnapshot" JSONB NOT NULL,
    "completedBookings" INTEGER NOT NULL,
    "grossRevenue" DECIMAL(12,2) NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "status" "StatementStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonPolicy" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "type" "PolicyType" NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonPolicy_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add tenant + consent columns (salonId nullable until backfilled)
ALTER TABLE "Appointment" ADD COLUMN "salonId" TEXT, ADD COLUMN "consentAt" TIMESTAMP(3), ADD COLUMN "consentVersion" TEXT, ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Barber" ADD COLUMN "salonId" TEXT;
ALTER TABLE "Client" ADD COLUMN "salonId" TEXT;
ALTER TABLE "SalonOpeningHour" ADD COLUMN "salonId" TEXT;
ALTER TABLE "SalonSettings" ADD COLUMN "salonId" TEXT;
ALTER TABLE "Service" ADD COLUMN "salonId" TEXT;
ALTER TABLE "User" ADD COLUMN "salonId" TEXT;

-- Backfill: the existing salon becomes tenant 'classic-cuts'
INSERT INTO "Salon" ("id","slug","name","logoUrl","phone","email","address","updatedAt")
SELECT gen_random_uuid()::text, 'classic-cuts', COALESCE(s."name",'Classic Cuts'), s."logo", s."phone", s."email", s."address", CURRENT_TIMESTAMP
FROM (SELECT 1) AS one LEFT JOIN "SalonSettings" s ON s."id" = 1;
UPDATE "Appointment" SET "salonId" = (SELECT "id" FROM "Salon" WHERE "slug"='classic-cuts');
UPDATE "Barber" SET "salonId" = (SELECT "id" FROM "Salon" WHERE "slug"='classic-cuts');
UPDATE "Client" SET "salonId" = (SELECT "id" FROM "Salon" WHERE "slug"='classic-cuts');
UPDATE "SalonOpeningHour" SET "salonId" = (SELECT "id" FROM "Salon" WHERE "slug"='classic-cuts');
UPDATE "SalonSettings" SET "salonId" = (SELECT "id" FROM "Salon" WHERE "slug"='classic-cuts');
UPDATE "Service" SET "salonId" = (SELECT "id" FROM "Salon" WHERE "slug"='classic-cuts');
UPDATE "User" SET "salonId" = (SELECT "id" FROM "Salon" WHERE "slug"='classic-cuts') WHERE "role" IN ('OWNER','STAFF');

-- Enforce tenancy now that every row is backfilled
ALTER TABLE "Appointment" ALTER COLUMN "salonId" SET NOT NULL;
ALTER TABLE "Barber" ALTER COLUMN "salonId" SET NOT NULL;
ALTER TABLE "Client" ALTER COLUMN "salonId" SET NOT NULL;
ALTER TABLE "SalonOpeningHour" ALTER COLUMN "salonId" SET NOT NULL;
ALTER TABLE "SalonSettings" ALTER COLUMN "salonId" SET NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "salonId" SET NOT NULL;

-- Profile fields now live on Salon
ALTER TABLE "SalonSettings" DROP COLUMN "address", DROP COLUMN "email", DROP COLUMN "logo", DROP COLUMN "name", DROP COLUMN "phone";

-- Settings are no longer a singleton row
CREATE SEQUENCE salonsettings_id_seq;
SELECT setval('salonsettings_id_seq', COALESCE((SELECT MAX("id") FROM "SalonSettings"), 0) + 1, false);
ALTER TABLE "SalonSettings" ALTER COLUMN "id" SET DEFAULT nextval('salonsettings_id_seq');
ALTER SEQUENCE salonsettings_id_seq OWNED BY "SalonSettings"."id";

-- DropIndex
DROP INDEX "Client_phone_key";

-- DropIndex
DROP INDEX "SalonOpeningHour_weekday_key";

-- CreateIndex
CREATE UNIQUE INDEX "Salon_slug_key" ON "Salon"("slug");

-- CreateIndex
CREATE INDEX "SalonBillingPlan_salonId_effectiveFrom_idx" ON "SalonBillingPlan"("salonId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "BillingStatement_salonId_periodStart_key" ON "BillingStatement"("salonId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "SalonPolicy_salonId_type_key" ON "SalonPolicy"("salonId", "type");

-- CreateIndex
CREATE INDEX "Appointment_salonId_appointmentDate_idx" ON "Appointment"("salonId", "appointmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "Client_salonId_phone_key" ON "Client"("salonId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "SalonOpeningHour_salonId_weekday_key" ON "SalonOpeningHour"("salonId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "SalonSettings_salonId_key" ON "SalonSettings"("salonId");

-- AddForeignKey
ALTER TABLE "SalonBillingPlan" ADD CONSTRAINT "SalonBillingPlan_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingStatement" ADD CONSTRAINT "BillingStatement_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonPolicy" ADD CONSTRAINT "SalonPolicy_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonSettings" ADD CONSTRAINT "SalonSettings_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonOpeningHour" ADD CONSTRAINT "SalonOpeningHour_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barber" ADD CONSTRAINT "Barber_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
