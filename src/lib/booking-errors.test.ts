import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { classifyBookingError } from "./booking-errors";
import { refundRuleText } from "./refund";

describe("classifyBookingError", () => {
  it("treats 403 as clients only", () => {
    expect(classifyBookingError(new ApiError(403, "forbidden")).kind).toBe(
      "clients-only",
    );
  });

  it("treats a plain 409 as a taken slot", () => {
    const result = classifyBookingError(
      new ApiError(
        409,
        "That time slot is no longer available. Please pick another time.",
      ),
    );
    expect(result.kind).toBe("slot-taken");
    expect(result.message).toMatch(/pick another time/i);
  });

  it("tells the 3-pending limit apart from a taken slot by its message", () => {
    const message =
      "You already have 3 unpaid pending bookings. Complete one or wait 15 minutes for it to expire.";
    const result = classifyBookingError(new ApiError(409, message));
    expect(result).toEqual({ kind: "pending-limit", message });
  });

  it("keeps the server's field errors for a 422", () => {
    const result = classifyBookingError(
      new ApiError(422, "Invalid", {
        starts_at: "Input should have timezone info",
      }),
    );
    expect(result).toMatchObject({
      kind: "invalid",
      fieldErrors: { starts_at: "Input should have timezone info" },
    });
  });

  it("keeps a plain 422 message when there are no field errors", () => {
    const result = classifyBookingError(
      new ApiError(422, "starts_at must be in the future"),
    );
    expect(result).toMatchObject({
      kind: "invalid",
      message: "starts_at must be in the future",
      fieldErrors: {},
    });
  });

  it("falls back to a network message for non-API errors and the server message otherwise", () => {
    expect(classifyBookingError(new TypeError("fetch failed")).kind).toBe(
      "other",
    );
    expect(classifyBookingError(new ApiError(500, "boom"))).toEqual({
      kind: "other",
      message: "boom",
    });
  });
});

describe("refundRuleText", () => {
  it("states the rule with a plural and singular unit", () => {
    expect(refundRuleText(24)).toBe(
      "Refund only if you cancel more than 24 hours before your appointment.",
    );
    expect(refundRuleText(1)).toContain("more than 1 hour before");
  });
});
