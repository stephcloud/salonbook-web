import { describe, expect, it } from "vitest";
import {
  clockOptionMinutes,
  formatApiTime,
  formatClockMinutes,
  lagosHour,
  formatLagosDate,
  formatLagosDateTime,
  formatLagosDay,
  formatLagosTime,
  isWholeMinuteApiTime,
  lagosToday,
  minutesToApiTime,
  parseApiTime,
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

describe("lagosToday", () => {
  it("returns the Lagos calendar day as YYYY-MM-DD", () => {
    expect(lagosToday(new Date("2026-03-07T10:00:00Z"))).toBe("2026-03-07");
  });

  it("rolls over to the next day at 23:00 UTC (midnight in Lagos)", () => {
    expect(lagosToday(new Date("2026-03-07T22:59:00Z"))).toBe("2026-03-07");
    expect(lagosToday(new Date("2026-03-07T23:00:00Z"))).toBe("2026-03-08");
  });
});

describe("formatLagosDay", () => {
  it("formats a calendar day without shifting it", () => {
    expect(formatLagosDay("2026-03-07")).toBe("Sat, 7 Mar 2026");
    expect(formatLagosDay("2026-12-31")).toBe("Thu, 31 Dec 2026");
  });
});

describe("wall-clock times from the availability API", () => {
  it("reads HH:MM:SS as minutes since midnight", () => {
    expect(parseApiTime("00:00:00")).toBe(0);
    expect(parseApiTime("09:00:00")).toBe(540);
    expect(parseApiTime("17:45:00")).toBe(1065);
    expect(parseApiTime("23:59:00")).toBe(1439);
    expect(parseApiTime("09:30")).toBe(570);
  });

  it("rejects things that are not times", () => {
    for (const bad of [
      "9:00",
      "24:00:00",
      "09:60:00",
      "noon",
      "",
      "09:00:61",
    ]) {
      expect(parseApiTime(bad)).toBeNull();
    }
  });

  it("tells whole minutes from times with seconds", () => {
    expect(isWholeMinuteApiTime("09:00:00")).toBe(true);
    expect(isWholeMinuteApiTime("09:00")).toBe(true);
    expect(isWholeMinuteApiTime("09:00:30")).toBe(false);
    expect(isWholeMinuteApiTime("09:00:00.500000")).toBe(false);
    expect(isWholeMinuteApiTime("nope")).toBe(false);
  });

  it("writes minutes in the form the API takes", () => {
    expect(minutesToApiTime(0)).toBe("00:00:00");
    expect(minutesToApiTime(570)).toBe("09:30:00");
    expect(minutesToApiTime(1439)).toBe("23:59:00");
    expect(() => minutesToApiTime(1440)).toThrow(RangeError);
    expect(() => minutesToApiTime(-1)).toThrow(RangeError);
    expect(() => minutesToApiTime(10.5)).toThrow(RangeError);
  });

  it("shows 12-hour clock text, including midnight and noon", () => {
    expect(formatClockMinutes(0)).toBe("12:00 AM");
    expect(formatClockMinutes(540)).toBe("9:00 AM");
    expect(formatClockMinutes(720)).toBe("12:00 PM");
    expect(formatClockMinutes(745)).toBe("12:25 PM");
    expect(formatClockMinutes(1065)).toBe("5:45 PM");
    expect(formatClockMinutes(1439)).toBe("11:59 PM");
    expect(formatApiTime("13:05:00")).toBe("1:05 PM");
    expect(() => formatApiTime("bad")).toThrow(RangeError);
  });

  it("round-trips what the pickers write", () => {
    for (const m of clockOptionMinutes()) {
      expect(parseApiTime(minutesToApiTime(m))).toBe(m);
    }
  });

  it("offers a time every 15 minutes by default", () => {
    const options = clockOptionMinutes();
    expect(options).toHaveLength(96);
    expect(options[0]).toBe(0);
    expect(options.at(-1)).toBe(1425);
    expect(clockOptionMinutes(30)).toHaveLength(48);
  });
});

describe("lagosHour", () => {
  it("gives the 24-hour Lagos hour, including midnight and noon", () => {
    expect(lagosHour("2026-03-07T00:15:00+01:00")).toBe(0);
    expect(lagosHour("2026-03-07T09:30:00+01:00")).toBe(9);
    expect(lagosHour("2026-03-07T12:00:00+01:00")).toBe(12);
    expect(lagosHour("2026-03-07T22:30:00Z")).toBe(23);
  });
});
