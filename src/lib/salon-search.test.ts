import { describe, expect, it } from "vitest";
import {
  MAX_QUERY_LENGTH,
  MAX_AREAS,
  isSearching,
  matchesSalon,
  parseQuery,
  parseSearch,
  salonAreas,
  salonsHref,
} from "./salon-search";

describe("matchesSalon", () => {
  const address = "12 Allen  Avenue, Ikeja, Lagos";
  const salon = (name: string) => ({ name, address });

  it.each([
    ["Pink Studio", "pink", true],
    ["Pink Studio", "  STUDIO ", true],
    ["Pink  Studio", "pink studio", true],
    ["Pink Studio", "pink   studio", true],
    ["Café Glam", "cafe", true],
    ["Pink Studio", "blue", false],
    ["Pink Studio", "", true],
    ["Pink Studio", "ikeja", false],
  ])("name %s with %j is %s", (name, q, expected) => {
    expect(matchesSalon(salon(name), { name: q, area: "" })).toBe(expected);
  });

  it.each([
    [" ikeja ", true],
    ["LAGOS", true],
    ["allen avenue", true],
    ["Allen   Avenue, IKEJA", true],
    ["Abuja", false],
    ["pink", false],
  ])("area %j is %s", (area, expected) => {
    expect(matchesSalon(salon("Pink Studio"), { name: "", area })).toBe(
      expected,
    );
  });

  it("needs both the name and the area when both are set", () => {
    const pink = salon("Pink Studio");
    expect(matchesSalon(pink, { name: "pink", area: "ikeja" })).toBe(true);
    expect(matchesSalon(pink, { name: "pink", area: "abuja" })).toBe(false);
    expect(matchesSalon(pink, { name: "blue", area: "ikeja" })).toBe(false);
  });

  it("matches an old ?q= link (no ?area=) on the name or the address", () => {
    const pink = salon("Pink Studio");
    expect(matchesSalon(pink, { name: "ikeja", area: null })).toBe(true);
    expect(matchesSalon(pink, { name: "pink", area: null })).toBe(true);
    expect(matchesSalon(pink, { name: "abuja", area: null })).toBe(false);
  });

  it("folds accents in the address too", () => {
    expect(
      matchesSalon(
        { name: "X", address: "Rue Café, Lomé" },
        {
          name: "",
          area: "lome",
        },
      ),
    ).toBe(true);
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

describe("parseSearch", () => {
  it("reads ?q= as the name and ?area= as the location", () => {
    expect(parseSearch(" pink ", "  ikeja ")).toEqual({
      name: "pink",
      area: "ikeja",
    });
    expect(parseSearch(undefined, "")).toEqual({ name: "", area: "" });
  });

  it("marks an old link without ?area= with a null area", () => {
    expect(parseSearch("lagos", undefined)).toEqual({
      name: "lagos",
      area: null,
    });
  });
});

describe("isSearching", () => {
  it("is true when either field has text", () => {
    expect(isSearching({ name: "", area: "" })).toBe(false);
    expect(isSearching({ name: "", area: null })).toBe(false);
    expect(isSearching({ name: "a", area: null })).toBe(true);
    expect(isSearching({ name: "", area: "b" })).toBe(true);
  });
});

describe("salonsHref", () => {
  it("omits empty fields and page 1, and encodes the terms", () => {
    expect(salonsHref({ name: "", area: "" }, 1)).toBe("/salons");
    expect(salonsHref({ name: "", area: null }, 3)).toBe("/salons?page=3");
    expect(salonsHref({ name: "", area: "a&b c" }, 1)).toBe(
      "/salons?area=a%26b+c",
    );
    expect(salonsHref({ name: "ana", area: "yaba" }, 2)).toBe(
      "/salons?q=ana&area=yaba&page=2",
    );
  });

  it("keeps a name-only search name-only and an old link old", () => {
    expect(salonsHref({ name: "ana", area: "" }, 2)).toBe(
      "/salons?q=ana&area=&page=2",
    );
    expect(salonsHref({ name: "ana", area: null }, 2)).toBe(
      "/salons?q=ana&page=2",
    );
  });
});
