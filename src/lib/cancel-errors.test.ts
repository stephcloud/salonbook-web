import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { classifyCancelError } from "./cancel-errors";

describe("classifyCancelError", () => {
  it("stays quiet on a 401 because apiFetch is redirecting to login", () => {
    expect(
      classifyCancelError(new ApiError(401, "Please sign in again.")),
    ).toEqual({ kind: "signed-out" });
  });

  it.each([403, 404, 422])(
    "treats %i as a booking that is not the client booking",
    (status) => {
      expect(classifyCancelError(new ApiError(status, "nope"))).toEqual({
        kind: "not-found",
        message: "We could not find this booking in your account.",
      });
    },
  );

  it("shows the API reason for another refusal such as cancelling too late", () => {
    expect(
      classifyCancelError(
        new ApiError(409, "This booking can no longer be cancelled."),
      ),
    ).toEqual({
      kind: "refused",
      message: "This booking can no longer be cancelled.",
    });
    expect(classifyCancelError(new ApiError(400, "Too late")).kind).toBe(
      "refused",
    );
  });

  it("hides raw server error text on a 5xx", () => {
    expect(
      classifyCancelError(new ApiError(500, "Traceback (most recent)")),
    ).toEqual({
      kind: "other",
      message: "We could not cancel your booking. Please try again.",
    });
  });

  it("explains a network failure", () => {
    expect(classifyCancelError(new TypeError("fetch failed"))).toMatchObject({
      kind: "other",
      message: expect.stringContaining("Could not reach the server"),
    });
  });
});
