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

  it("tells a salon that is not taking bookings apart from a taken slot", () => {
    expect(
      classifyBookingError(
        new ApiError(409, "salon is not accepting bookings"),
      ),
    ).toEqual({
      kind: "salon-closed",
      message: "This salon isn't taking bookings right now.",
    });
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

  it("treats an unfamiliar 409 message as a taken slot (the limit is told apart only by its text)", () => {
    expect(classifyBookingError(new ApiError(409, "Conflict")).kind).toBe(
      "slot-taken",
    );
  });

  it("stays quiet on a 401 because apiFetch is already redirecting to login", () => {
    expect(
      classifyBookingError(new ApiError(401, "Please sign in again.")),
    ).toEqual({ kind: "signed-out", message: "Redirecting you to sign in..." });
  });

  it("falls back to a network message for non-API errors", () => {
    expect(classifyBookingError(new TypeError("fetch failed")).kind).toBe(
      "other",
    );
  });

  it("shows other client errors as sent but hides raw server error text", () => {
    expect(classifyBookingError(new ApiError(404, "not found"))).toEqual({
      kind: "other",
      message: "not found",
    });
    expect(
      classifyBookingError(new ApiError(500, "Traceback (most recent call)")),
    ).toEqual({
      kind: "other",
      message: "We could not create your booking. Please try again.",
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
