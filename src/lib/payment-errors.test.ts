import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { classifyPayError } from "./payment-errors";

describe("classifyPayError", () => {
  it("stays quiet on a 401 because apiFetch is redirecting to login", () => {
    expect(
      classifyPayError(new ApiError(401, "Please sign in again.")),
    ).toEqual({
      kind: "signed-out",
    });
  });

  it.each([403, 404, 422])(
    "treats %i as a booking that is not the client's",
    (status) => {
      expect(classifyPayError(new ApiError(status, "nope"))).toEqual({
        kind: "not-found",
      });
    },
  );

  it("treats the 409 for a cancelled booking as closed, keeping the API's message", () => {
    expect(
      classifyPayError(
        new ApiError(409, "This booking can no longer be paid for."),
      ),
    ).toEqual({
      kind: "closed",
      message: "This booking can no longer be paid for.",
    });
  });

  it("hides raw server error text on a 5xx", () => {
    expect(
      classifyPayError(new ApiError(500, "Traceback (most recent)")),
    ).toEqual({
      kind: "other",
      message: "We could not start the payment. Please try again.",
    });
  });

  it("explains a network failure", () => {
    const result = classifyPayError(new TypeError("fetch failed"));
    expect(result.kind).toBe("other");
    expect(result).toMatchObject({
      message: expect.stringContaining("Could not reach the server"),
    });
  });
});
