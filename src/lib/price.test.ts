import { describe, expect, it } from "vitest";
import { QUOTE_PRICE_LABEL, formatDuration, formatServicePrice } from "./price";

describe("formatServicePrice", () => {
  it("formats a fixed price in naira", () => {
    expect(formatServicePrice({ price_type: "fixed", price: 1500000 })).toBe(
      "₦15,000",
    );
  });

  it("shows the consultation label for a quote", () => {
    expect(formatServicePrice({ price_type: "quote", price: null })).toBe(
      QUOTE_PRICE_LABEL,
    );
  });

  it("ignores a stray price on a quote service", () => {
    expect(formatServicePrice({ price_type: "quote", price: 500000 })).toBe(
      QUOTE_PRICE_LABEL,
    );
  });

  it("falls back to the consultation label when a fixed price is missing", () => {
    expect(formatServicePrice({ price_type: "fixed", price: null })).toBe(
      QUOTE_PRICE_LABEL,
    );
  });
});

describe("formatDuration", () => {
  it.each([
    [45, "45 min"],
    [60, "1 hr"],
    [90, "1 hr 30 min"],
    [120, "2 hr"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});
