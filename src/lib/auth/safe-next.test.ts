import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it.each([
    ["/salons", "/salons"],
    ["/book/abc?service=1", "/book/abc?service=1"],
    ["/dashboard/bookings#top", "/dashboard/bookings#top"],
  ])("keeps %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "salons",
    "",
    "/ok\nHeader: x",
    "/a\\b",
  ])("rejects %j", (input) => {
    expect(safeNextPath(input)).toBeNull();
  });

  it("rejects null and undefined", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
