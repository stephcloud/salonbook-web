import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import type { RuleRef } from "./convert";
import { breakKey, describeAvailabilitySaveError } from "./save-error";

const refs: RuleRef[] = [
  { kind: "hours", day: 0 },
  { kind: "break", day: 0, index: 0 },
  { kind: "hours", day: 4 },
  { kind: "dayoff", date: "2026-12-25" },
];

function unprocessable(detail: unknown) {
  return new ApiError(422, "Something went wrong.", {}, detail);
}

function describe422(detail: unknown) {
  return describeAvailabilitySaveError(unprocessable(detail), refs);
}

describe("describeAvailabilitySaveError", () => {
  it("puts a row-level 422 on the day it came from", () => {
    const result = describe422([
      {
        loc: ["body", "rules", 2],
        msg: "Value error, end_time must be after start_time",
      },
    ]);
    expect(result.days).toEqual({
      4: "The end time must be after the start time.",
    });
    expect(result.message).toBeNull();
  });

  it("puts a field-level 422 on a break", () => {
    const result = describe422([
      {
        loc: ["body", "rules", 1, "start_time"],
        msg: "Input should be in a valid time format",
      },
    ]);
    expect(result.breaks[breakKey(0, 0)]).toBe(
      "Input should be in a valid time format",
    );
  });

  it("puts a day-off 422 on the days off list", () => {
    const result = describe422([
      {
        loc: ["body", "rules", 3, "off_date"],
        msg: "Input should be a valid date",
      },
    ]);
    expect(result.daysOff).toBe("Input should be a valid date");
  });

  it("reads the plain sentences that carry no row", () => {
    expect(describe422("overlapping break rules on weekday 1").days[1]).toMatch(
      /breaks overlap/,
    );
    expect(
      describe422("overlapping working rules on weekday 2").days[2],
    ).toMatch(/overlap/);
    expect(describe422("duplicate day_off date").daysOff).toMatch(/already/);
  });

  it("shows an error that points at no row as a page message", () => {
    const result = describe422([
      { loc: ["body", "rules"], msg: "List should have at most 200 items" },
    ]);
    expect(result.message).toBe("List should have at most 200 items");
  });

  it("never loses an unknown 422", () => {
    expect(describe422(undefined).message).toBeTruthy();
    expect(describe422("something new").message).toBe("Something new");
  });

  it("handles 401, 403, 404, 409, 500 and no network", () => {
    const describeStatus = (status: number, message: string) =>
      describeAvailabilitySaveError(new ApiError(status, message), refs);

    expect(describeStatus(401, "invalid credentials").signedOut).toBe(true);
    expect(describeStatus(403, "forbidden").message).toMatch(/your own salon/);
    expect(describeStatus(404, "stylist not found").message).toMatch(
      /could not find this stylist/,
    );
    expect(describeStatus(409, "Bookings clash").message).toBe(
      "Bookings clash",
    );
    expect(describeStatus(500, "Internal Server Error").message).toMatch(
      /our side/,
    );
    expect(
      describeAvailabilitySaveError(new TypeError("fetch failed"), refs)
        .message,
    ).toMatch(/Could not reach the server/);
  });
});
