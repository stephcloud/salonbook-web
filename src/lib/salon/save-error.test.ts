import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { DEPOSIT_RANGE_MESSAGE } from "./validate";
import { describeSaveError } from "./save-error";

describe("describeSaveError", () => {
  it("puts 422 field errors on the fields and shows no form-wide message", () => {
    const result = describeSaveError(
      new ApiError(422, "x", { name: "Field required", phone: "Too short" }),
      "create",
    );
    expect(result).toEqual({
      fields: { name: "Field required", phone: "Too short" },
      message: null,
      signedOut: false,
    });
  });

  it("explains a deposit error in naira", () => {
    const result = describeSaveError(
      new ApiError(422, "x", {
        deposit_amount: "Input should be less than or equal to 100000000",
      }),
      "edit",
    );
    expect(result.fields.deposit_amount).toBe(DEPOSIT_RANGE_MESSAGE);
  });

  it("shows a form-wide message for a 422 about something the form lacks", () => {
    expect(
      describeSaveError(
        new ApiError(422, "x", { owner_id: "Not allowed" }),
        "edit",
      ),
    ).toMatchObject({ fields: {}, message: "Not allowed" });
  });

  it("shows a form-wide message for a 422 with no details", () => {
    expect(describeSaveError(new ApiError(422, "x"), "create").message).toBe(
      "Check the form and try again.",
    );
  });

  it("marks a 401 as signed out", () => {
    expect(describeSaveError(new ApiError(401, "x"), "create")).toMatchObject({
      signedOut: true,
      message: "Please sign in again.",
    });
  });

  it("words a 403 by what was being done", () => {
    expect(describeSaveError(new ApiError(403, "x"), "create").message).toBe(
      "Only salon owners can create a salon.",
    );
    expect(describeSaveError(new ApiError(403, "x"), "edit").message).toBe(
      "You can only edit your own salon.",
    );
  });

  it("explains a 404", () => {
    expect(describeSaveError(new ApiError(404, "x"), "edit").message).toMatch(
      /could not find this salon/i,
    );
  });

  it("hides the text of a 500 but keeps the proxy's own words for a 502 or 504", () => {
    expect(
      describeSaveError(new ApiError(500, "Traceback: secret"), "edit").message,
    ).toBe("Something went wrong on our side. Please try again.");
    expect(
      describeSaveError(
        new ApiError(504, "The server is not responding."),
        "edit",
      ).message,
    ).toBe("The server is not responding.");
  });

  it("says the network is the problem for any other error", () => {
    expect(describeSaveError(new TypeError("Failed to fetch"), "edit")).toEqual(
      {
        fields: {},
        message:
          "Could not reach the server. Check your connection and try again.",
        signedOut: false,
      },
    );
  });
});
