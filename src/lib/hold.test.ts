import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  holdEndsAt,
  isHoldExpired,
  parseApiTime,
  remainingMs,
} from "./hold";

const CREATED = "2026-10-11T09:28:55.605873Z";
const CREATED_MS = Date.parse(CREATED);
const MINUTE = 60_000;

describe("holdEndsAt", () => {
  it("is 15 minutes after the booking was created", () => {
    expect(holdEndsAt(CREATED)).toBe(CREATED_MS + 15 * MINUTE);
  });
});

describe("parseApiTime", () => {
  const UTC_MS = Date.parse("2026-10-11T09:28:55.605873Z");

  it("reads Z and explicit offsets as given", () => {
    expect(parseApiTime("2026-10-11T09:28:55.605873Z")).toBe(UTC_MS);
    expect(parseApiTime("2026-10-11T10:28:55.605873+01:00")).toBe(UTC_MS);
    expect(parseApiTime("2026-10-11T10:28:55.605873+0100")).toBe(UTC_MS);
    expect(parseApiTime("2026-10-11T04:28:55.605873-05:00")).toBe(UTC_MS);
  });

  it("treats a timestamp with no zone as UTC, never as local time", () => {
    expect(parseApiTime("2026-10-11T09:28:55.605873")).toBe(UTC_MS);
    expect(parseApiTime("2026-10-11T09:28:55")).toBe(
      Date.parse("2026-10-11T09:28:55Z"),
    );
  });

  it("gives the same hold end for a missing Z, so the countdown cannot shift an hour", () => {
    expect(holdEndsAt("2026-10-11T09:00:00")).toBe(
      holdEndsAt("2026-10-11T09:00:00Z"),
    );
    expect(
      remainingMs("2026-10-11T09:00:00", Date.parse("2026-10-11T09:05:00Z")),
    ).toBe(10 * MINUTE);
  });

  it("is NaN for something that is not a time (remainingMs then treats it as expired)", () => {
    expect(Number.isNaN(parseApiTime("not a date"))).toBe(true);
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

describe("isHoldExpired", () => {
  const base = { cancelled_at: null, created_at: CREATED };

  it("is false for a pending booking inside its 15 minutes", () => {
    expect(
      isHoldExpired({ ...base, status: "pending" }, CREATED_MS + 14 * MINUTE),
    ).toBe(false);
  });

  it("is true for a pending booking once the 15 minutes are up", () => {
    expect(
      isHoldExpired({ ...base, status: "pending" }, CREATED_MS + 15 * MINUTE),
    ).toBe(true);
  });

  it("is true for a booking the API cancelled by itself (no cancelled_at)", () => {
    expect(
      isHoldExpired({ ...base, status: "cancelled" }, CREATED_MS + MINUTE),
    ).toBe(true);
  });

  it("is false for a booking the client cancelled (cancelled_at set)", () => {
    expect(
      isHoldExpired(
        { ...base, status: "cancelled", cancelled_at: "2026-10-11T09:03:00Z" },
        CREATED_MS + 20 * MINUTE,
      ),
    ).toBe(false);
  });

  it.each(["confirmed", "completed", "no_show"])(
    "is false for a %s booking",
    (status) => {
      expect(isHoldExpired({ ...base, status }, CREATED_MS + 60 * MINUTE)).toBe(
        false,
      );
    },
  );
});
