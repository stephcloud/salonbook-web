import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import {
  canOwnerCancel,
  classifyOwnerCancelError,
  OWNER_CANCEL_STALE_MESSAGE,
  ownerCancelOutcome,
} from "./owner-cancel";

const NOW = Date.parse("2026-10-14T10:00:00Z");
const FUTURE = "2026-10-16T08:00:00+01:00";
const PAST = "2026-10-13T08:00:00+01:00";

describe("canOwnerCancel", () => {
  it.each(["pending", "confirmed"] as const)(
    "allows a future %s booking",
    (status) => {
      expect(canOwnerCancel({ status, starts_at: FUTURE }, NOW)).toBe(true);
    },
  );

  it.each(["cancelled", "completed", "no_show"] as const)(
    "hides it for %s",
    (status) => {
      expect(canOwnerCancel({ status, starts_at: FUTURE }, NOW)).toBe(false);
    },
  );

  it("hides it once the booking has started", () => {
    expect(canOwnerCancel({ status: "confirmed", starts_at: PAST }, NOW)).toBe(
      false,
    );
  });
});

describe("classifyOwnerCancelError", () => {
  it("treats 401 as signed out", () => {
    expect(classifyOwnerCancelError(new ApiError(401, "x")).kind).toBe(
      "signed-out",
    );
  });

  it("gives a role message for 403", () => {
    expect(classifyOwnerCancelError(new ApiError(403, "forbidden"))).toEqual({
      kind: "forbidden",
      message: "Only the owner of this salon can cancel its bookings.",
    });
  });

  it("says the booking can't be cancelled any more for 409", () => {
    expect(classifyOwnerCancelError(new ApiError(409, "started"))).toEqual({
      kind: "stale",
      message: OWNER_CANCEL_STALE_MESSAGE,
    });
  });

  it("shows the server's field errors for 422", () => {
    const error = new ApiError(422, "Invalid", {
      booking_id: "Input should be a valid UUID",
    });
    expect(classifyOwnerCancelError(error)).toEqual({
      kind: "invalid",
      message: "Input should be a valid UUID",
    });
  });

  it("offers a retry for network failures and server errors", () => {
    expect(classifyOwnerCancelError(new TypeError("fetch failed")).kind).toBe(
      "retry",
    );
    expect(classifyOwnerCancelError(new ApiError(502, "bad")).kind).toBe(
      "retry",
    );
  });
});

describe("ownerCancelOutcome", () => {
  it("says the deposit will be refunded only when refund_due is true", () => {
    expect(ownerCancelOutcome(true)).toBe("Deposit will be refunded in full");
    expect(ownerCancelOutcome(false)).toBe("Nothing to refund");
    expect(ownerCancelOutcome(null)).toBe("Nothing to refund");
  });
});
