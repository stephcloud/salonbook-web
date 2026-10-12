import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { describeServiceSaveError } from "./save-error";
import { serviceServerErrors } from "./validate";

describe("serviceServerErrors: fields the form cannot show", () => {
  it("sends a price_type error to the general message", () => {
    expect(
      serviceServerErrors({ price_type: "Input should be fixed or quote" }),
    ).toEqual({ fields: {}, general: "Input should be fixed or quote" });
  });

  it("sends a price error to the general message while the price is hidden", () => {
    expect(serviceServerErrors({ price: "price must be null" }, false)).toEqual(
      { fields: {}, general: "price must be null" },
    );
  });

  it("keeps a price error on the field while the price is shown", () => {
    expect(
      Object.keys(serviceServerErrors({ price: "too big" }, true).fields),
    ).toEqual(["price"]);
  });
});

describe("describeServiceSaveError: a 422 is never left without a visible reason", () => {
  it("shows the price_type message as the form message", () => {
    const failure = describeServiceSaveError(
      new ApiError(422, "x", { price_type: "bad type" }),
    );
    expect(failure.message).toBe("bad type");
  });

  it("shows the price message as the form message while a quote is chosen", () => {
    const failure = describeServiceSaveError(
      new ApiError(422, "x", { price: "must be null" }),
      false,
    );
    expect(failure.message).toBe("must be null");
    expect(failure.fields).toEqual({});
  });
});
