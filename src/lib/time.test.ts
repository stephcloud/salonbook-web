import { describe, expect, it } from "vitest";
import {
  formatLagosDate,
  formatLagosDateTime,
  formatLagosTime,
} from "@/lib/time";

describe("Africa/Lagos formatting", () => {
  it("shows an ISO time with +01:00 as given", () => {
    const slot = "2026-03-07T09:30:00+01:00";
    expect(formatLagosTime(slot)).toBe("9:30 AM");
    expect(formatLagosDate(slot)).toBe("Sat, 7 Mar 2026");
    expect(formatLagosDateTime(slot)).toBe("Sat, 7 Mar 2026, 9:30 AM");
  });

  it("converts UTC to Lagos time, crossing midnight", () => {
    const utc = "2026-03-01T23:30:00Z";
    expect(formatLagosDate(utc)).toBe("Mon, 2 Mar 2026");
    expect(formatLagosTime(utc)).toBe("12:30 AM");
  });

  it("handles afternoon times", () => {
    expect(formatLagosTime("2026-03-07T14:05:00+01:00")).toBe("2:05 PM");
  });

  it("accepts a Date", () => {
    expect(formatLagosDateTime(new Date("2026-12-25T11:00:00Z"))).toBe(
      "Fri, 25 Dec 2026, 12:00 PM",
    );
  });

  it("is not affected by the machine time zone", () => {
    expect(formatLagosDate("2026-07-01T00:00:00+01:00")).toBe(
      "Wed, 1 Jul 2026",
    );
  });

  it("throws on an invalid date", () => {
    expect(() => formatLagosDate("not a date")).toThrow(RangeError);
  });
});
