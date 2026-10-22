import { describe, expect, it } from "vitest";
import type { Stylist } from "@/lib/api";
import {
  changedStylistFields,
  EMPTY_STYLIST_VALUES,
  stylistServerErrors,
  toStylistPayload,
  validateStylist,
  valuesFromStylist,
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

const ADA: Stylist = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  name: "Ada",
  image_url: null,
  service_ids: [],
};
const WITH_PHOTO: Stylist = { ...ADA, image_url: "https://x.com/a.png" };

describe("valuesFromStylist", () => {
  it("turns a missing photo into an empty field", () => {
    expect(valuesFromStylist(ADA)).toEqual({ name: "Ada", image_url: "" });
  });

  it("keeps the name and photo link", () => {
    expect(valuesFromStylist(WITH_PHOTO)).toEqual({
      name: "Ada",
      image_url: "https://x.com/a.png",
    });
  });
});

describe("changedStylistFields", () => {
  it("returns nothing when nothing changed", () => {
    expect(changedStylistFields(ADA, valuesFromStylist(ADA))).toEqual({});
    expect(
      changedStylistFields(WITH_PHOTO, valuesFromStylist(WITH_PHOTO)),
    ).toEqual({});
  });

  it("sends only the trimmed name when only the name changed", () => {
    expect(
      changedStylistFields(ADA, { name: "  Ada B  ", image_url: "" }),
    ).toEqual({ name: "Ada B" });
  });

  it("sends only the photo when a photo is added", () => {
    expect(
      changedStylistFields(ADA, {
        name: "Ada",
        image_url: " https://x.com/b.png ",
      }),
    ).toEqual({ image_url: "https://x.com/b.png" });
  });

  it("sends image_url null when the photo is cleared", () => {
    expect(
      changedStylistFields(WITH_PHOTO, { name: "Ada", image_url: "" }),
    ).toEqual({ image_url: null });
    expect(
      changedStylistFields(WITH_PHOTO, { name: "Ada", image_url: "   " }),
    ).toEqual({ image_url: null });
  });

  it("treats a value that only differs by surrounding spaces as unchanged", () => {
    expect(
      changedStylistFields(WITH_PHOTO, {
        name: " Ada ",
        image_url: " https://x.com/a.png ",
      }),
    ).toEqual({});
  });

  it("sends both fields when both changed", () => {
    expect(
      changedStylistFields(WITH_PHOTO, { name: "Bea", image_url: "" }),
    ).toEqual({ name: "Bea", image_url: null });
  });
});
