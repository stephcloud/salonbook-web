import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import {
  HAS_BOOKINGS_MESSAGE,
  describeServiceDeleteError,
  describeServiceSaveError,
} from "./save-error";

describe("describeServiceDeleteError", () => {
  it("explains a 409 as bookings", () => {
    expect(describeServiceDeleteError(new ApiError(409, "conflict"))).toEqual({
      message:
        "This has bookings, so it can't be deleted. Cancel or complete them first.",
      signedOut: false,
    });
  });

  it("explains the live API's bare 500 as most likely bookings", () => {
    const { message } = describeServiceDeleteError(new ApiError(500, "x"));
    expect(message).toContain(HAS_BOOKINGS_MESSAGE);
    expect(message).toMatch(/try again/);
  });

  it("flags a 401 as signed out and handles 403, 404 and a network failure", () => {
    expect(describeServiceDeleteError(new ApiError(401, "x")).signedOut).toBe(
      true,
    );
    expect(describeServiceDeleteError(new ApiError(403, "x")).message).toMatch(
      /your own salon/,
    );
    expect(describeServiceDeleteError(new ApiError(404, "x")).message).toMatch(
      /already gone/,
    );
    expect(describeServiceDeleteError(new TypeError("fetch")).message).toMatch(
      /Could not reach the server/,
    );
  });
});

describe("describeServiceSaveError", () => {
  it("maps a 422 to the form's fields", () => {
    const failure = describeServiceSaveError(
      new ApiError(422, "x", {
        name: "String should have at least 1 character",
      }),
    );
    expect(failure.fields.name).toMatch(/at least 1/);
    expect(failure.message).toBeNull();
  });

  it("shows a plain-sentence 422 from the API as the form message", () => {
    const failure = describeServiceSaveError(
      new ApiError(422, "price is required when price_type is fixed"),
    );
    expect(failure.message).toBe("price is required when price_type is fixed");
  });

  it("falls back to a generic check message when the 422 has nothing to show", () => {
    const failure = describeServiceSaveError(
      new ApiError(422, "Something went wrong. Please try again."),
    );
    expect(failure.message).toBe("Check the form and try again.");
  });

  it("flags 401 as signed out", () => {
    expect(describeServiceSaveError(new ApiError(401, "x")).signedOut).toBe(
      true,
    );
  });
});
