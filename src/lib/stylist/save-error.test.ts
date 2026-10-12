import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { describeAssignError, describeStylistCreateError } from "./save-error";

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
