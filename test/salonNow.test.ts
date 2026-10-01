import { describe, expect, it } from "vitest";

import { salonNow } from "@/lib/server/availability";
import { normalizePhone } from "@/lib/server/clients";

describe("salonNow", () => {
  // 2026-10-01T22:00:00Z is 03:30 on 2 Oct in India: the salon's "today" is
  // already the 2nd even though a UTC server still says the 1st.
  const instant = new Date("2026-10-01T22:00:00Z");

  it("reads the wall clock of the salon's zone through local getters", () => {
    const now = salonNow("Asia/Kolkata", instant);
    expect([now.getFullYear(), now.getMonth() + 1, now.getDate()]).toEqual([2026, 10, 2]);
    expect([now.getHours(), now.getMinutes()]).toEqual([3, 30]);
  });

  it("differs from another zone for the same instant", () => {
    const now = salonNow("America/New_York", instant);
    expect([now.getDate(), now.getHours()]).toEqual([1, 18]);
  });
});

describe("normalizePhone", () => {
  it("collapses formatting differences to one key", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhone(" (98765) 43210 ")).toBe("9876543210");
  });
});
