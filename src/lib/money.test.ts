import { describe, expect, it } from "vitest";
import { formatNaira } from "@/lib/money";

describe("formatNaira", () => {
  it("formats whole naira without decimals", () => {
    expect(formatNaira(500000)).toBe("₦5,000");
  });

  it("formats zero", () => {
    expect(formatNaira(0)).toBe("₦0");
  });

  it("groups thousands and millions", () => {
    expect(formatNaira(123456700)).toBe("₦1,234,567");
  });

  it("shows kobo only when there is a remainder", () => {
    expect(formatNaira(150050)).toBe("₦1,500.50");
    expect(formatNaira(5)).toBe("₦0.05");
  });

  it("formats negative amounts", () => {
    expect(formatNaira(-250000)).toBe("-₦2,500");
  });

  it("rejects amounts that are not whole kobo", () => {
    expect(() => formatNaira(10.5)).toThrow(RangeError);
    expect(() => formatNaira(Number.NaN)).toThrow(RangeError);
  });
});
