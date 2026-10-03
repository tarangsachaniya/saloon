-- Multi-service bookings, owner/staff-recorded walk-ins, percent-or-flat worker commission.
-- Hand-written so the Prisma-invisible Appointment.slotRange is not dropped by a
-- generated diff. Additive: every existing row keeps its meaning (ONLINE source,
-- blocks the calendar, PERCENT commission, one service item back-filled).

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('ONLINE', 'WALK_IN');

-- Appointment: where it came from, whether it occupies the calendar, the
-- amount actually charged (entered by owner/staff) and who recorded it.
ALTER TABLE "Appointment" ADD COLUMN "source" "AppointmentSource" NOT NULL DEFAULT 'ONLINE';
ALTER TABLE "Appointment" ADD COLUMN "blocksCalendar" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Appointment" ADD COLUMN "amountCharged" DECIMAL(10,2);
ALTER TABLE "Appointment" ADD COLUMN "recordedById" TEXT;
ALTER TABLE "Appointment" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_amountCharged_nonneg" CHECK ("amountCharged" IS NULL OR "amountCharged" >= 0);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Appointment_salonId_source_status_idx" ON "Appointment"("salonId", "source", "status");

-- Quick sales are recorded after the fact and must not collide
-- with calendar bookings: only rows that block the calendar are exclusive.
ALTER TABLE "Appointment" DROP CONSTRAINT "no_overlapping_appointments";
ALTER TABLE "Appointment" ADD CONSTRAINT "no_overlapping_appointments"
  EXCLUDE USING gist ("barberId" WITH =, "slotRange" WITH &&)
  WHERE (status NOT IN ('CANCELLED', 'NO_SHOW') AND "blocksCalendar");

-- CreateTable: the services of one appointment, performed back-to-back.
CREATE TABLE "AppointmentService" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AppointmentService_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AppointmentService_appointmentId_idx" ON "AppointmentService"("appointmentId");
CREATE INDEX "AppointmentService_serviceId_idx" ON "AppointmentService"("serviceId");
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Back-fill: every existing appointment had exactly one service.
INSERT INTO "AppointmentService" ("id", "appointmentId", "serviceId", "name", "price", "durationMinutes", "sortOrder")
SELECT gen_random_uuid()::text, a."id", a."serviceId", s."name", a."price", a."durationMinutes", 0
FROM "Appointment" a JOIN "Service" s ON s."id" = a."serviceId";

-- Barber: commission is a percentage of the amount OR a flat amount per service.
ALTER TABLE "Barber" ADD COLUMN "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "Barber" ADD COLUMN "commissionFlatAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Barber" ADD CONSTRAINT "Barber_commissionFlatAmount_nonneg" CHECK ("commissionFlatAmount" >= 0);

-- WorkerCommission: snapshot the rule and the work it was earned on.
ALTER TABLE "WorkerCommission" ADD COLUMN "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "WorkerCommission" ADD COLUMN "flatAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "WorkerCommission" ADD COLUMN "serviceCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "WorkerCommission" ADD COLUMN "source" "AppointmentSource" NOT NULL DEFAULT 'ONLINE';

-- Worker logins: an owner-created STAFF user may be linked to one worker
-- (Barber). A linked worker records walk-ins only as themselves and sees only
-- their own earnings. SET NULL keeps the login if the worker row is removed.
ALTER TABLE "User" ADD COLUMN "barberId" TEXT;
CREATE UNIQUE INDEX "User_barberId_key" ON "User"("barberId");
ALTER TABLE "User" ADD CONSTRAINT "User_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
