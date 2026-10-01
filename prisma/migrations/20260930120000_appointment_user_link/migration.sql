-- Phase 4: link an appointment to the signed-in customer who booked it.
-- Additive and nullable: existing rows keep NULL (guest bookings) and are not
-- touched. Hand-written (a generated diff would drop the Prisma-invisible
-- Appointment.slotRange).

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Appointment_userId_appointmentDate_idx" ON "Appointment"("userId", "appointmentDate");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
