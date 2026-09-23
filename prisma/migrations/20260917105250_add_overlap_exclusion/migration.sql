-- Double-booking protection: a Postgres exclusion constraint that makes
-- overlapping active appointments for the same barber impossible to insert,
-- atomically, at the database level (no app-side locking/retry needed).

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Generated column combining appointmentDate + startTime/endTime (minutes
-- since midnight) into a timestamp range, so the exclusion constraint below
-- can use the `&&` (overlap) operator on it.
ALTER TABLE "Appointment" ADD COLUMN "slotRange" tsrange
  GENERATED ALWAYS AS (
    tsrange(
      ("appointmentDate" + ("startTime" * interval '1 minute')),
      ("appointmentDate" + ("endTime" * interval '1 minute'))
    )
  ) STORED;

-- Reject any insert/update whose (barberId, slotRange) overlaps an existing
-- active (not cancelled/no-show) appointment for the same barber.
ALTER TABLE "Appointment" ADD CONSTRAINT "no_overlapping_appointments"
  EXCLUDE USING gist (
    "barberId" WITH =,
    "slotRange" WITH &&
  ) WHERE (status NOT IN ('CANCELLED', 'NO_SHOW'));
