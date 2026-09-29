-- Per-salon shop-page theme. Additive, hand-written (see earlier migrations:
-- a generated diff would drop the Prisma-invisible Appointment.slotRange).

-- CreateEnum
CREATE TYPE "SalonTheme" AS ENUM ('SPA', 'CUT', 'PLAYFUL', 'LUXE');

-- AlterTable
ALTER TABLE "Salon" ADD COLUMN "theme" "SalonTheme" NOT NULL DEFAULT 'SPA';

-- The existing barbershop reads best in the monochrome barbershop theme.
UPDATE "Salon" SET "theme" = 'CUT' WHERE "slug" = 'classic-cuts';
