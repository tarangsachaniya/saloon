-- Per-worker switch: may customers pre-book this worker online? Off = walk-ins
-- only (still on the dashboard, still earns commission). Additive; every
-- existing worker stays bookable. Hand-written (slotRange must survive).
ALTER TABLE "Barber" ADD COLUMN "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true;
