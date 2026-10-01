import { describe, expect, it } from "vitest";

import { bucketOf, changeDecision } from "@/lib/server/appointmentPolicy";

// Appointment dates are stored as UTC midnight; "now" is the salon wall clock.
const appt = (date: string, startTime: number, status = "CONFIRMED", duration = 30) => ({
  appointmentDate: new Date(`${date}T00:00:00Z`),
  startTime,
  endTime: startTime + duration,
  status,
});
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);

describe("changeDecision", () => {
  const now = at(2026, 10, 5, 12, 0);

  it("allows a future appointment outside the window", () => {
    expect(changeDecision(appt("2026-10-05", 15 * 60), now, 60, "cancel").allowed).toBe(true);
  });

  it("blocks inside the cancellation window, with an explanation", () => {
    const d = changeDecision(appt("2026-10-05", 12 * 60 + 30), now, 60, "cancel");
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/1 hour/);
  });

  it("allows exactly at the window boundary", () => {
    expect(changeDecision(appt("2026-10-05", 13 * 60), now, 60, "reschedule").allowed).toBe(true);
  });

  it("blocks past, cancelled and finished appointments", () => {
    expect(changeDecision(appt("2026-10-05", 9 * 60), now, 60, "cancel").allowed).toBe(false);
    expect(changeDecision(appt("2026-10-09", 9 * 60, "CANCELLED"), now, 60, "cancel").reason).toMatch(/already cancelled/);
    expect(changeDecision(appt("2026-10-09", 9 * 60, "COMPLETED"), now, 60, "cancel").allowed).toBe(false);
    expect(changeDecision(appt("2026-10-09", 9 * 60, "IN_PROGRESS"), now, 60, "cancel").allowed).toBe(false);
  });

  it("a zero-minute window still blocks appointments that already started", () => {
    expect(changeDecision(appt("2026-10-05", 11 * 60 + 59), now, 0, "cancel").allowed).toBe(false);
    expect(changeDecision(appt("2026-10-05", 12 * 60 + 1), now, 0, "cancel").allowed).toBe(true);
  });
});

describe("bucketOf", () => {
  const now = at(2026, 10, 5, 12, 0);

  it("sorts by status first, then by whether it has ended", () => {
    expect(bucketOf(appt("2026-10-09", 600, "CANCELLED"), now)).toBe("cancelled");
    expect(bucketOf(appt("2026-10-09", 600, "COMPLETED"), now)).toBe("past");
    expect(bucketOf(appt("2026-10-09", 600, "NO_SHOW"), now)).toBe("past");
    expect(bucketOf(appt("2026-10-09", 600), now)).toBe("upcoming");
    expect(bucketOf(appt("2026-10-01", 600), now)).toBe("past");
  });

  it("an appointment in progress today stays upcoming until it ends", () => {
    expect(bucketOf(appt("2026-10-05", 11 * 60 + 45), now)).toBe("upcoming");
    expect(bucketOf(appt("2026-10-05", 10 * 60), now)).toBe("past");
  });
});
