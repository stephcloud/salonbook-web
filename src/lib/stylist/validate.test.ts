import { describe, expect, it } from "vitest";
import {
  EMPTY_STYLIST_VALUES,
  stylistServerErrors,
  toStylistPayload,
  validateStylist,
} from "./validate";

describe("validateStylist", () => {
  it("needs a name and accepts an empty image", () => {
    expect(validateStylist(EMPTY_STYLIST_VALUES).name).toBeDefined();
    expect(validateStylist({ name: "Ada", image_url: "" })).toEqual({});
  });

  it("accepts only https image links without spaces", () => {
    expect(
      validateStylist({ name: "Ada", image_url: "http://x.com/a.png" })
        .image_url,
    ).toBeDefined();
    expect(
      validateStylist({ name: "Ada", image_url: "https://x.com/a b.png" })
        .image_url,
    ).toBeDefined();
    expect(
      validateStylist({ name: "Ada", image_url: "https://x.com/a.png" }),
    ).toEqual({});
    expect(
      validateStylist({
        name: "Ada",
        image_url: `https://x.com/${"a".repeat(500)}`,
      }).image_url,
    ).toMatch(/500/);
  });

  it("limits the name to 100 characters", () => {
    expect(
      validateStylist({ name: "x".repeat(101), image_url: "" }).name,
    ).toMatch(/100/);
  });
});

describe("toStylistPayload", () => {
  it("trims, leaves out an empty image, and carries no credentials", () => {
    expect(
      toStylistPayload("salon-1", { name: " Ada ", image_url: " " }),
    ).toEqual({
      salon_id: "salon-1",
      name: "Ada",
    });
    expect(
      toStylistPayload("salon-1", {
        name: "Ada",
        image_url: " https://x.com/a.png ",
      }),
    ).toEqual({
      salon_id: "salon-1",
      name: "Ada",
      image_url: "https://x.com/a.png",
    });
  });
});

describe("stylistServerErrors (422 mapping)", () => {
  it("maps known fields and puts the rest in a general message", () => {
    expect(stylistServerErrors({ image_url: "bad", email: "invalid" })).toEqual(
      { fields: { image_url: "bad" }, general: "invalid" },
    );
  });
});
