-- Phase 5: worker commission. Purely additive - no existing row is touched
-- (existing barbers default to 0%, and no commission is back-filled for
-- appointments completed before this feature). Hand-written so the
-- Prisma-invisible Appointment.slotRange is not dropped by a generated diff.

-- CreateEnum
CREATE TYPE "WorkerCommissionStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "Barber" ADD COLUMN "commissionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "Barber" ADD CONSTRAINT "Barber_commissionPercentage_range" CHECK ("commissionPercentage" >= 0 AND "commissionPercentage" <= 100);

-- CreateTable
CREATE TABLE "WorkerCommission" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "commissionPercentage" DECIMAL(5,2) NOT NULL,
    "serviceAmount" DECIMAL(10,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "status" "WorkerCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerCommission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerCommission_appointmentId_key" ON "WorkerCommission"("appointmentId");
CREATE INDEX "WorkerCommission_salonId_barberId_status_idx" ON "WorkerCommission"("salonId", "barberId", "status");
CREATE INDEX "WorkerCommission_salonId_createdAt_idx" ON "WorkerCommission"("salonId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkerCommission" ADD CONSTRAINT "WorkerCommission_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkerCommission" ADD CONSTRAINT "WorkerCommission_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkerCommission" ADD CONSTRAINT "WorkerCommission_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
