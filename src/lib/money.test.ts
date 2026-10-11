import { describe, expect, it } from "vitest";
import {
  MAX_DEPOSIT_KOBO,
  formatNaira,
  koboToNairaInput,
  nairaToKobo,
} from "@/lib/money";

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

describe("nairaToKobo", () => {
  it.each([
    ["5000", 500000],
    ["5,000", 500000],
    ["5000.5", 500050],
    ["5000.50", 500050],
    ["5000.05", 500005],
    ["₦5,000", 500000],
    ["₦ 5,000.25", 500025],
    ["  1  ", 100],
    ["0.01", 1],
    ["1,000,000", 100_000_000],
    ["1000000", 100_000_000],
    ["12,345,678.90", 1_234_567_890],
  ])("turns %s into %i kobo", (text, kobo) => {
    expect(nairaToKobo(text)).toBe(kobo);
  });

  it("never produces a fractional kobo from decimals", () => {
    for (const text of ["0.1", "0.29", "1.15", "19.99", "4.35"]) {
      const kobo = nairaToKobo(text);
      expect(Number.isInteger(kobo)).toBe(true);
    }
    // 0.29 and 4.35 are the classic cases where * 100 goes wrong in floating point.
    expect(nairaToKobo("0.29")).toBe(29);
    expect(nairaToKobo("4.35")).toBe(435);
    expect(nairaToKobo("1.15")).toBe(115);
  });

  it.each([
    [""],
    ["   "],
    ["abc"],
    ["0"],
    ["0.00"],
    ["-5"],
    ["-5000.00"],
    ["5000.123"],
    ["5.000"],
    [".5"],
    ["5."],
    ["5 000"],
    ["5,00,0"],
    ["1,2,3"],
    ["12,34"],
    ["1e3"],
    ["5000naira"],
    ["NaN"],
    ["Infinity"],
    ["99999999999999999999"],
  ])("rejects %j", (text) => {
    expect(nairaToKobo(text)).toBeNull();
  });
});

describe("koboToNairaInput", () => {
  it.each([
    [500000, "5000"],
    [500050, "5000.50"],
    [500005, "5000.05"],
    [123456, "1234.56"],
    [100, "1"],
    [1, "0.01"],
    [0, "0"],
    [100_000_000, "1000000"],
  ])("writes %i kobo as %s", (kobo, text) => {
    expect(koboToNairaInput(kobo)).toBe(text);
  });

  it("round-trips with nairaToKobo", () => {
    for (const kobo of [1, 99, 100, 101, 500000, 500050, 123456, 100_000_000]) {
      expect(nairaToKobo(koboToNairaInput(kobo))).toBe(kobo);
    }
  });

  it("refuses an amount that is not whole kobo or is negative", () => {
    expect(() => koboToNairaInput(12.5)).toThrow(RangeError);
    expect(() => koboToNairaInput(-1)).toThrow(RangeError);
  });
});

describe("MAX_DEPOSIT_KOBO", () => {
  it("is the API limit: ₦1,000,000", () => {
    expect(MAX_DEPOSIT_KOBO).toBe(100_000_000);
    expect(formatNaira(MAX_DEPOSIT_KOBO)).toBe("₦1,000,000");
  });
});
