import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { isSalonNotAccepting, SALON_STATUS } from "./salon-status";

describe("SALON_STATUS", () => {
  it("uses the booking badge colours: amber, green, grey", () => {
    expect(SALON_STATUS.pending.variant).toBe("pending");
    expect(SALON_STATUS.approved.variant).toBe("confirmed");
    expect(SALON_STATUS.suspended.variant).toBe("cancelled");
  });
});

describe("isSalonNotAccepting", () => {
  it("matches the API's 409 for a pending or suspended salon", () => {
    expect(
      isSalonNotAccepting(new ApiError(409, "salon is not accepting bookings")),
    ).toBe(true);
  });

  it.each([
    new ApiError(409, "slot is no longer available"),
    new ApiError(400, "salon is not accepting bookings"),
    new Error("salon is not accepting bookings"),
  ])("ignores anything else (%s)", (error) => {
    expect(isSalonNotAccepting(error)).toBe(false);
  });
});
