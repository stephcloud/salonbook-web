import { describe, expect, it } from "vitest";
import { NO_OWNER_BOOKING_FILTERS } from "@/lib/api";
import {
  filterProblem,
  hasActiveFilters,
  paymentLabel,
  refundBadge,
  servicePriceLabel,
} from "@/lib/owner-bookings";

const SERVICE = { id: "s1", price_type: "fixed", price: 1500000 } as const;
const QUOTE = { id: "s2", price_type: "quote", price: null } as const;

describe("payment wording", () => {
  it("maps each payment status", () => {
    expect(paymentLabel({ payment_status: null })).toBe("Deposit not paid");
    expect(paymentLabel({ payment_status: "pending" })).toBe(
      "Deposit not paid",
    );
    expect(paymentLabel({ payment_status: "paid" })).toBe("Deposit paid");
    expect(paymentLabel({ payment_status: "failed" })).toBe("Payment failed");
  });

  it("shows the blue refund chip only for refunds", () => {
    expect(refundBadge({ payment_status: "paid" })).toBeNull();
    expect(refundBadge({ payment_status: null })).toBeNull();
    expect(refundBadge({ payment_status: "refund_pending" })).toBe(
      "Refund pending",
    );
    expect(refundBadge({ payment_status: "refunded" })).toBe("Refunded");
  });
});

describe("servicePriceLabel", () => {
  it("formats a fixed price through the money helper", () => {
    expect(
      servicePriceLabel({ service: { id: "s1" } } as never, [SERVICE]),
    ).toBe("₦15,000");
  });

  it("says Price on consultation for a quote", () => {
    expect(servicePriceLabel({ service: { id: "s2" } } as never, [QUOTE])).toBe(
      "Price on consultation",
    );
  });

  it("returns null when the service no longer exists", () => {
    expect(
      servicePriceLabel({ service: { id: "gone" } } as never, [SERVICE]),
    ).toBeNull();
  });
});

describe("filters", () => {
  it("rejects a From date after the To date", () => {
    expect(
      filterProblem({
        ...NO_OWNER_BOOKING_FILTERS,
        from: "2026-10-17",
        to: "2026-10-15",
      }),
    ).toMatch(/must not be after/);
    expect(
      filterProblem({
        ...NO_OWNER_BOOKING_FILTERS,
        from: "2026-10-16",
        to: "2026-10-16",
      }),
    ).toBeNull();
  });

  it("knows when any filter is set", () => {
    expect(hasActiveFilters(NO_OWNER_BOOKING_FILTERS)).toBe(false);
    expect(
      hasActiveFilters({
        ...NO_OWNER_BOOKING_FILTERS,
        status: "paid" as never,
      }),
    ).toBe(true);
    expect(
      hasActiveFilters({ ...NO_OWNER_BOOKING_FILTERS, to: "2026-10-16" }),
    ).toBe(true);
  });
});
