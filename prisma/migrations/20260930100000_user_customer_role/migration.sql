-- Phase 1 auth foundation, step 1: add the CUSTOMER role.
-- Own migration: Postgres cannot use a new enum value in the transaction that adds it.
-- Hand-written (a generated diff would drop the Prisma-invisible Appointment.slotRange).

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';
