import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import {
  describeAssignError,
  describeStylistCreateError,
  describeStylistDeleteError,
  describeStylistUpdateError,
  STYLIST_HAS_BOOKINGS_MESSAGE,
} from "./save-error";

describe("describeStylistCreateError", () => {
  it.each([502, 504])(
    "treats a %s as uncertain: the stylist may exist, check before retrying",
    (status) => {
      const failure = describeStylistCreateError(new ApiError(status, "x"));
      expect(failure.uncertain).toBe(true);
      expect(failure.message).toMatch(/Check the list before you try again/);
    },
  );

  it("flags a 401 as signed out and maps 403, 404 and 422", () => {
    expect(describeStylistCreateError(new ApiError(401, "x")).signedOut).toBe(
      true,
    );
    expect(describeStylistCreateError(new ApiError(403, "x")).message).toMatch(
      /your own salon/,
    );
    expect(describeStylistCreateError(new ApiError(404, "x")).message).toMatch(
      /could not find this salon/,
    );
    expect(
      describeStylistCreateError(new ApiError(422, "x", { name: "too short" }))
        .fields.name,
    ).toBe("too short");
  });

  it("does not call an ordinary failure uncertain", () => {
    expect(
      describeStylistCreateError(new ApiError(500, "x")).uncertain,
    ).toBeUndefined();
  });
});

describe("describeAssignError", () => {
  it("maps 401, 403, 404, 422 and a network failure", () => {
    expect(describeAssignError(new ApiError(401, "x")).signedOut).toBe(true);
    expect(describeAssignError(new ApiError(403, "x")).message).toMatch(
      /your own salon/,
    );
    expect(describeAssignError(new ApiError(404, "x")).message).toMatch(
      /could not find this stylist/,
    );
    expect(describeAssignError(new ApiError(422, "x")).message).toMatch(
      /no longer in this salon/,
    );
    expect(describeAssignError(new TypeError("fetch")).message).toMatch(
      /Could not reach the server/,
    );
  });
});

const GONE = "This stylist no longer exists. The list has been refreshed.";

describe("describeStylistUpdateError", () => {
  it("flags a 401 as signed out", () => {
    const failure = describeStylistUpdateError(new ApiError(401, "x"));
    expect(failure.signedOut).toBe(true);
    expect(failure.message).toBe("Please sign in again.");
  });

  it("explains a 403 as not the owner's own salon", () => {
    const failure = describeStylistUpdateError(new ApiError(403, "x"));
    expect(failure.message).toBe(
      "You can only change stylists in your own salon.",
    );
    expect(failure.signedOut).toBe(false);
  });

  it("marks a 404 as gone so the list is re-read", () => {
    const failure = describeStylistUpdateError(new ApiError(404, "x"));
    expect(failure.gone).toBe(true);
    expect(failure.message).toBe(GONE);
  });

  it("maps a 422 to field errors with no form-level message", () => {
    const failure = describeStylistUpdateError(
      new ApiError(422, "x", { image_url: "bad url" }),
    );
    expect(failure.fields).toEqual({ image_url: "bad url" });
    expect(failure.message).toBeNull();
  });

  it("puts a 422 for an unknown field in the form-level message", () => {
    const failure = describeStylistUpdateError(
      new ApiError(422, "x", { email: "invalid" }),
    );
    expect(failure.fields).toEqual({});
    expect(failure.message).toBe("invalid");
  });

  it("falls back to a generic check message for a 422 with no details", () => {
    expect(describeStylistUpdateError(new ApiError(422, "x")).message).toBe(
      "Check the form and try again.",
    );
  });

  it("gives a generic message for a 500", () => {
    expect(describeStylistUpdateError(new ApiError(500, "x")).message).toBe(
      "Something went wrong on our side. Please try again.",
    );
  });

  it("says the server could not be reached for a non-API error", () => {
    const failure = describeStylistUpdateError(new TypeError("fetch"));
    expect(failure.message).toMatch(/Could not reach the server/);
    expect(failure.signedOut).toBe(false);
    expect(failure.gone).toBeUndefined();
  });
});

describe("describeStylistDeleteError", () => {
  it("flags a 401 as signed out", () => {
    const failure = describeStylistDeleteError(new ApiError(401, "x"));
    expect(failure.signedOut).toBe(true);
    expect(failure.message).toBe("Please sign in again.");
  });

  it("explains a 403 as not the owner's own salon, with no point retrying", () => {
    const failure = describeStylistDeleteError(new ApiError(403, "x"));
    expect(failure.message).toBe(
      "You can only delete stylists in your own salon.",
    );
    expect(failure.forbidden).toBe(true);
  });

  it("marks a 404 as gone so the list is re-read", () => {
    const failure = describeStylistDeleteError(new ApiError(404, "x"));
    expect(failure.gone).toBe(true);
    expect(failure.message).toBe(GONE);
  });

  it("marks a 409 as has-bookings with the edit-instead message", () => {
    const failure = describeStylistDeleteError(new ApiError(409, "x"));
    expect(failure.hasBookings).toBe(true);
    expect(failure.message).toBe(STYLIST_HAS_BOOKINGS_MESSAGE);
    expect(failure.signedOut).toBe(false);
  });

  it("gives a generic message for a 500", () => {
    const failure = describeStylistDeleteError(new ApiError(500, "x"));
    expect(failure.message).toBe(
      "Something went wrong on our side. Please try again.",
    );
    expect(failure.hasBookings).toBeUndefined();
  });

  it("says the server could not be reached for a non-API error", () => {
    expect(describeStylistDeleteError(new TypeError("fetch")).message).toMatch(
      /Could not reach the server/,
    );
  });
});
