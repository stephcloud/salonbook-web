import { describe, expect, it } from "vitest";
import {
  MAX_QUERY_LENGTH,
  matchesSalonName,
  parseQuery,
  salonsHref,
} from "./salon-search";

describe("matchesSalonName", () => {
  it.each([
    ["Pink Studio", "pink", true],
    ["Pink Studio", "  STUDIO ", true],
    ["Café Glam", "cafe", true],
    ["Pink Studio", "blue", false],
    ["Pink Studio", "", true],
  ])("%s with %j is %s", (name, query, expected) => {
    expect(matchesSalonName(name, query)).toBe(expected);
  });
});

describe("parseQuery", () => {
  it("trims, limits the length and takes the first of repeated values", () => {
    expect(parseQuery("  ana ")).toBe("ana");
    expect(parseQuery(undefined)).toBe("");
    expect(parseQuery(["a", "b"])).toBe("a");
    expect(parseQuery("x".repeat(500))).toHaveLength(MAX_QUERY_LENGTH);
  });
});

describe("salonsHref", () => {
  it("omits an empty term and page 1, and encodes the term", () => {
    expect(salonsHref("", 1)).toBe("/salons");
    expect(salonsHref("", 3)).toBe("/salons?page=3");
    expect(salonsHref("a&b c", 1)).toBe("/salons?q=a%26b+c");
    expect(salonsHref("ana", 2)).toBe("/salons?q=ana&page=2");
  });
});
