import { describe, expect, it } from "vitest";
import { formatCountdown, holdEndsAt, remainingMs } from "./hold";

const CREATED = "2026-10-11T09:28:55.605873Z";
const CREATED_MS = Date.parse(CREATED);
const MINUTE = 60_000;

describe("holdEndsAt", () => {
  it("is 15 minutes after the booking was created", () => {
    expect(holdEndsAt(CREATED)).toBe(CREATED_MS + 15 * MINUTE);
  });
});

describe("remainingMs", () => {
  it("counts from the booking's own timestamp, not from when the page loaded", () => {
    expect(remainingMs(CREATED, CREATED_MS + 14 * MINUTE + 59_000)).toBe(1000);
    expect(remainingMs(CREATED, CREATED_MS)).toBe(15 * MINUTE);
  });

  it("reaches exactly 0 at created_at + 15 minutes and stays there", () => {
    expect(remainingMs(CREATED, CREATED_MS + 15 * MINUTE)).toBe(0);
    expect(remainingMs(CREATED, CREATED_MS + 20 * MINUTE)).toBe(0);
  });

  it("corrects a device clock that is wrong by the given skew", () => {
    // Device clock is 3 minutes behind the server: skew = +3 minutes.
    const deviceNow = CREATED_MS + 10 * MINUTE;
    expect(remainingMs(CREATED, deviceNow, 3 * MINUTE)).toBe(2 * MINUTE);
    // Device clock 3 minutes ahead: skew = -3 minutes.
    expect(remainingMs(CREATED, deviceNow, -3 * MINUTE)).toBe(8 * MINUTE);
  });

  it("treats an unreadable created_at as no time left", () => {
    expect(remainingMs("not a date", CREATED_MS)).toBe(0);
  });
});

describe("formatCountdown", () => {
  it.each([
    [15 * MINUTE, "15:00"],
    [14 * MINUTE + 59_000, "14:59"],
    [61_000, "1:01"],
    [1000, "0:01"],
    [1, "0:01"],
    [0, "0:00"],
    [-5000, "0:00"],
  ])("formats %i ms as %s", (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });
});
