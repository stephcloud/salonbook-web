import { describe, expect, it } from "vitest";
import {
  MAX_QUERY_LENGTH,
  MAX_AREAS,
  matchesSalon,
  parseQuery,
  salonAreas,
  salonsHref,
} from "./salon-search";

describe("matchesSalon", () => {
  const address = "12 Allen Avenue, Ikeja, Lagos";
  it.each([
    ["Pink Studio", "pink", true],
    ["Pink Studio", "  STUDIO ", true],
    ["Café Glam", "cafe", true],
    ["Pink Studio", "blue", false],
    ["Pink Studio", "", true],
    ["Pink Studio", " ikeja ", true],
    ["Pink Studio", "LAGOS", true],
    ["Pink Studio", "Abuja", false],
  ])("%s with %j is %s", (name, query, expected) => {
    expect(matchesSalon({ name, address }, query)).toBe(expected);
  });

  it("folds accents in the address too", () => {
    expect(matchesSalon({ name: "X", address: "Rue Café, Lomé" }, "lome")).toBe(
      true,
    );
  });
});

describe("salonAreas", () => {
  it("takes areas from real addresses and skips street lines and blanks", () => {
    expect(
      salonAreas([
        "GRA",
        "1 Test Street",
        "-",
        "1 Probe Street, Lagos",
        "1 Probe Street, Lagos",
        "No 36 Imoke street GRA",
      ]),
    ).toEqual(["Lagos", "GRA"]);
  });

  it("skips street names even without a house number", () => {
    expect(
      salonAreas(["Imoke street GRA", "Allen Avenue, Off Awolowo Road, Ikeja"]),
    ).toEqual(["Ikeja"]);
  });

  it("uses every part after the first and merges case and accents", () => {
    expect(
      salonAreas([
        "5 Road, Ikeja, Lagos",
        "Allen Avenue, ikeja ",
        "Lekki,lagos",
      ]),
    ).toEqual(["Ikeja", "Lagos"]);
  });

  it("orders by how many salons share the area, then A to Z", () => {
    expect(salonAreas(["a, Yaba", "b, Yaba", "c, Ajah", "d, Lekki"])).toEqual([
      "Yaba",
      "Ajah",
      "Lekki",
    ]);
  });

  it(`keeps at most ${MAX_AREAS}`, () => {
    const many = Array.from(
      { length: 12 },
      (_, i) => `Street, Area ${"x".repeat(i + 1)}`,
    );
    expect(salonAreas(many)).toHaveLength(MAX_AREAS);
  });

  it("returns nothing when no address names an area", () => {
    expect(salonAreas([])).toEqual([]);
    expect(salonAreas(["1 Test Street", "-", ""])).toEqual([]);
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
