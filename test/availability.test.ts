// Pure unit tests for the availability engine - no database, no HTTP.
// Everything here feeds plain in-memory fixtures into the same functions the
// Route Handlers and the booking write-path use.
//
// Ported verbatim from `backend/test/availability.test.js` (Jest -> Vitest;
// the assertions and fixtures are unchanged) against
// `lib/server/availability.ts`.

import { describe, expect, test } from "vitest";

import {
  computeSlotsForBarber,
  serializeSlots,
  unionSlots,
  getEffectiveWindow,
  generateCandidateSlots,
  minutesToHHMM,
  hhmmToMinutes,
  weekdayOf,
  validateBookingDate,
  overlaps,
  toDateString,
  isValidDateString,
  type SlotInt,
} from "@/lib/server/availability";

// 2026-09-21 is a Monday (weekday 1); 2026-09-20 is a Sunday (weekday 0).
const MONDAY = "2026-09-21";
const SUNDAY = "2026-09-20";
// A "now" a week before MONDAY, so the minimum-advance rule never applies
// unless a test deliberately sets today's date.
const NOW = new Date(2026, 8, 14, 9, 0, 0);

const OPEN_10_TO_20 = { weekday: 1, isOpen: true, openTime: 600, closeTime: 1200 };
const CLOSED = { weekday: 0, isOpen: false, openTime: 0, closeTime: 0 };
const WORKS_10_TO_20 = { weekday: 1, isWorking: true, startTime: 600, endTime: 1200 };

const SERVICE_30 = { durationMinutes: 30 };
const SERVICE_45 = { durationMinutes: 45 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function slotsFor(overrides: Record<string, any> = {}): SlotInt[] {
  return computeSlotsForBarber({
    openingHour: OPEN_10_TO_20,
    workingHour: WORKS_10_TO_20,
    breaks: [],
    existingAppointments: [],
    service: SERVICE_30,
    slotIntervalMinutes: 15,
    minimumAdvanceBookingMinutes: 30,
    date: MONDAY,
    now: NOW,
    ...overrides,
  });
}

const starts = (slots: SlotInt[]) => slots.map((s) => minutesToHHMM(s.start));
const availableStarts = (slots: SlotInt[]) => starts(slots.filter((s) => s.available));
const find = (slots: SlotInt[], hhmm: string) =>
  slots.find((s) => s.start === hhmmToMinutes(hhmm));

describe("time helpers", () => {
  test("minute <-> HH:MM round trip with zero padding", () => {
    expect(minutesToHHMM(600)).toBe("10:00");
    expect(minutesToHHMM(545)).toBe("09:05");
    expect(minutesToHHMM(0)).toBe("00:00");
    expect(hhmmToMinutes("09:05")).toBe(545);
    expect(hhmmToMinutes("9:05")).toBe(545);
    expect(hhmmToMinutes("25:00")).toBeNull();
    expect(hhmmToMinutes("nonsense")).toBeNull();
  });

  test("weekday comes from the calendar string, not the local timezone", () => {
    expect(weekdayOf("2026-09-20")).toBe(0); // Sunday
    expect(weekdayOf("2026-09-21")).toBe(1); // Monday
    expect(weekdayOf("2026-09-26")).toBe(6); // Saturday
  });

  test("date-string validation rejects impossible calendar dates", () => {
    expect(isValidDateString("2026-09-21")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("21-09-2026")).toBe(false);
  });

  test("overlap uses strict inequalities so touching intervals do not collide", () => {
    expect(overlaps(600, 660, 660, 690)).toBe(false); // ends exactly when the other starts
    expect(overlaps(660, 690, 600, 660)).toBe(false);
    expect(overlaps(600, 660, 630, 690)).toBe(true);
  });
});

describe("effective window + candidate generation", () => {
  test("intersects salon hours with the barber shift", () => {
    expect(
      getEffectiveWindow({
        openingHour: { isOpen: true, openTime: 600, closeTime: 1200 },
        workingHour: { isWorking: true, startTime: 540, endTime: 1080 },
      }),
    ).toEqual({ start: 600, end: 1080 });
  });

  test("returns null when the intersection is empty", () => {
    expect(
      getEffectiveWindow({
        openingHour: { isOpen: true, openTime: 600, closeTime: 720 },
        workingHour: { isWorking: true, startTime: 780, endTime: 1200 },
      }),
    ).toBeNull();
  });

  test("a slot that would overrun the window is never generated", () => {
    // 10:00-11:30 window, 45 minute service: 10:45-11:30 is the last that fits.
    const candidates = generateCandidateSlots({
      window: { start: 600, end: 690 },
      durationMinutes: 45,
      slotIntervalMinutes: 15,
    });
    expect(candidates.map((c) => minutesToHHMM(c.start))).toEqual([
      "10:00",
      "10:15",
      "10:30",
      "10:45",
    ]);
    expect(minutesToHHMM(candidates[candidates.length - 1].end)).toBe("11:30");
  });
});

describe("valid slots for a 10:00-20:00 barber with a 30 minute service", () => {
  const slots = slotsFor();

  test("starts on the 15 minute grid at opening time", () => {
    expect(starts(slots).slice(0, 4)).toEqual(["10:00", "10:15", "10:30", "10:45"]);
  });

  test("last slot ends exactly at closing time", () => {
    const last = slots[slots.length - 1];
    expect(minutesToHHMM(last.start)).toBe("19:30");
    expect(minutesToHHMM(last.end)).toBe("20:00");
  });

  test("every slot is available when nothing is booked", () => {
    expect(slots.every((s) => s.available)).toBe(true);
    expect(slots).toHaveLength(39); // 10:00..19:30 inclusive, every 15 minutes
  });

  test("serializes to zero-padded HH:MM strings", () => {
    expect(serializeSlots(slots)[0]).toEqual({ start: "10:00", end: "10:30", available: true });
  });
});

describe("existing appointments", () => {
  const slots = slotsFor({
    existingAppointments: [{ startTime: 660, endTime: 690, status: "CONFIRMED" }], // 11:00-11:30
  });

  test("an 11:00-11:30 appointment makes the 11:00 slot unavailable", () => {
    expect(find(slots, "11:00")!.available).toBe(false);
  });

  test("it also blocks the overlapping 10:45 and 11:15 starts", () => {
    expect(find(slots, "10:45")!.available).toBe(false);
    expect(find(slots, "11:15")!.available).toBe(false);
  });

  test("the touching 10:30-11:00 and 11:30-12:00 slots stay bookable", () => {
    expect(find(slots, "10:30")!.available).toBe(true);
    expect(find(slots, "11:30")!.available).toBe(true);
  });

  test("an appointment ending exactly at 11:00 does not block an 11:00 start", () => {
    const boundary = slotsFor({
      existingAppointments: [{ startTime: 630, endTime: 660, status: "CONFIRMED" }], // 10:30-11:00
    });
    expect(find(boundary, "11:00")!.available).toBe(true);
    expect(find(boundary, "10:30")!.available).toBe(false);
  });

  test("cancelled and no-show appointments do not block anything", () => {
    const ignored = slotsFor({
      existingAppointments: [
        { startTime: 660, endTime: 690, status: "CANCELLED" },
        { startTime: 720, endTime: 750, status: "NO_SHOW" },
      ],
    });
    expect(find(ignored, "11:00")!.available).toBe(true);
    expect(find(ignored, "12:00")!.available).toBe(true);
  });
});

describe("breaks", () => {
  const slots = slotsFor({
    breaks: [{ weekday: 1, startTime: 780, endTime: 840, label: "Lunch" }], // 13:00-14:00
  });

  test("a 13:00-14:00 break removes every start inside it", () => {
    expect(find(slots, "13:00")!.available).toBe(false);
    expect(find(slots, "13:15")!.available).toBe(false);
    expect(find(slots, "13:30")!.available).toBe(false);
    expect(find(slots, "13:45")!.available).toBe(false);
  });

  test("it also removes the 12:45 slot that would run into the break", () => {
    expect(find(slots, "12:45")!.available).toBe(false);
  });

  test("12:30 (ending exactly at 13:00) and 14:00 remain bookable", () => {
    expect(find(slots, "12:30")!.available).toBe(true);
    expect(find(slots, "14:00")!.available).toBe(true);
  });
});

describe("service duration vs closing time", () => {
  const slots45 = slotsFor({ service: SERVICE_45 });

  test("a 45 minute service has no 19:30 slot at all when closing is 20:00", () => {
    expect(find(slots45, "19:30")).toBeUndefined();
    expect(starts(slots45)).not.toContain("19:30");
  });

  test("its last slot is 19:15-20:00", () => {
    const last = slots45[slots45.length - 1];
    expect(minutesToHHMM(last.start)).toBe("19:15");
    expect(minutesToHHMM(last.end)).toBe("20:00");
  });

  test("15 minute interval with a 45 minute duration still steps :00/:15/:30/:45", () => {
    expect(starts(slots45).slice(0, 4)).toEqual(["10:00", "10:15", "10:30", "10:45"]);
  });

  test("an overrunning slot is absent, not merely available:false", () => {
    const nearClose = computeSlotsForBarber({
      openingHour: { isOpen: true, openTime: 600, closeTime: 690 }, // 10:00-11:30
      workingHour: { isWorking: true, startTime: 600, endTime: 690 },
      service: SERVICE_45,
      slotIntervalMinutes: 15,
      minimumAdvanceBookingMinutes: 0,
      date: MONDAY,
      now: NOW,
    });
    // 11:00 would end at 11:45, past the 11:30 close - it is simply absent.
    expect(starts(nearClose)).toEqual(["10:00", "10:15", "10:30", "10:45"]);
    expect(starts(nearClose)).not.toContain("11:00");
    expect(nearClose.every((s) => s.available)).toBe(true);
  });
});

describe("days off and closures", () => {
  test("a barber not working that weekday yields zero slots", () => {
    expect(
      slotsFor({ workingHour: { weekday: 1, isWorking: false, startTime: 600, endTime: 1200 } }),
    ).toEqual([]);
  });

  test("a missing working-hour row yields zero slots", () => {
    expect(slotsFor({ workingHour: null })).toEqual([]);
  });

  test("a one-off BarberDayOff on that exact date yields zero slots", () => {
    expect(slotsFor({ isDayOff: true })).toEqual([]);
    expect(slotsFor({ daysOff: [{ date: new Date(Date.UTC(2026, 8, 21)) }] })).toEqual([]);
  });

  test("a day off on a different date does not affect the day being queried", () => {
    expect(slotsFor({ daysOff: [{ date: new Date(Date.UTC(2026, 8, 22)) }] }).length).toBeGreaterThan(
      0,
    );
  });

  test("the salon being closed that weekday wins over any barber schedule", () => {
    expect(
      computeSlotsForBarber({
        openingHour: CLOSED,
        workingHour: { weekday: 0, isWorking: true, startTime: 600, endTime: 1200 },
        service: SERVICE_30,
        slotIntervalMinutes: 15,
        minimumAdvanceBookingMinutes: 0,
        date: SUNDAY,
        now: NOW,
      }),
    ).toEqual([]);
  });

  test("a missing opening-hour row yields zero slots", () => {
    expect(slotsFor({ openingHour: null })).toEqual([]);
  });
});

describe("minimum advance booking window", () => {
  test("slots inside the cutoff are unavailable for today only", () => {
    const now = new Date(2026, 8, 21, 10, 5, 0); // 10:05 on the Monday itself
    const today = toDateString(now);
    const slots = slotsFor({ date: today, now, minimumAdvanceBookingMinutes: 30 });

    // cutoff = 10:05 + 30min = 10:35
    expect(find(slots, "10:00")!.available).toBe(false);
    expect(find(slots, "10:15")!.available).toBe(false);
    expect(find(slots, "10:30")!.available).toBe(false);
    expect(find(slots, "10:45")!.available).toBe(true);
    expect(find(slots, "11:00")!.available).toBe(true);
  });

  test("the same clock time on a future date is unaffected", () => {
    const now = new Date(2026, 8, 20, 10, 5, 0); // the day before
    const slots = slotsFor({ date: MONDAY, now, minimumAdvanceBookingMinutes: 30 });
    expect(find(slots, "10:00")!.available).toBe(true);
  });
});

describe('"any barber" union', () => {
  test("a start is available when at least one barber is free", () => {
    const busy = slotsFor({
      existingAppointments: [{ startTime: 660, endTime: 690, status: "CONFIRMED" }],
    });
    const free = slotsFor();
    const merged = unionSlots([busy, free]);
    expect(find(merged, "11:00")!.available).toBe(true);
  });

  test("a start is unavailable only when every barber is busy", () => {
    const busy = slotsFor({
      existingAppointments: [{ startTime: 660, endTime: 690, status: "CONFIRMED" }],
    });
    const merged = unionSlots([busy, busy]);
    expect(find(merged, "11:00")!.available).toBe(false);
  });

  test("it unions differing shifts rather than intersecting them", () => {
    const morning = slotsFor({ workingHour: { isWorking: true, startTime: 600, endTime: 720 } }); // 10-12
    const evening = slotsFor({ workingHour: { isWorking: true, startTime: 1020, endTime: 1200 } }); // 17-20
    const merged = unionSlots([morning, evening]);
    expect(availableStarts(merged)).toContain("10:00");
    expect(availableStarts(merged)).toContain("17:00");
    expect(starts(merged)).not.toContain("13:00");
  });

  test("merged slots come back sorted by start time", () => {
    const merged = unionSlots([slotsFor(), slotsFor()]);
    const values = merged.map((s) => s.start);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });
});

describe("booking window validation", () => {
  const salonSettings = { maximumAdvanceBookingDays: 30 };
  const now = new Date(2026, 8, 17, 12, 0, 0); // 2026-09-17

  test("rejects a malformed date", () => {
    expect(validateBookingDate({ date: "17-09-2026", salonSettings, now }).ok).toBe(false);
  });

  test("rejects a past date", () => {
    const result = validateBookingDate({ date: "2026-09-16", salonSettings, now });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/past/i);
  });

  test("accepts today and the furthest allowed day", () => {
    expect(validateBookingDate({ date: "2026-09-17", salonSettings, now }).ok).toBe(true);
    expect(validateBookingDate({ date: "2026-10-17", salonSettings, now }).ok).toBe(true);
  });

  test("rejects a date beyond maximumAdvanceBookingDays", () => {
    const result = validateBookingDate({ date: "2026-10-18", salonSettings, now });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/30 days/);
  });
});
