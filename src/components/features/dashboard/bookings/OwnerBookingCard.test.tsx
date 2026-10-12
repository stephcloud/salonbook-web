import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OwnerBooking } from "@/lib/api";
import { OwnerBookingCard } from "./OwnerBookingCard";

const SERVICE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
type Services = Parameters<typeof OwnerBookingCard>[0]["services"];
const FIXED: Services = [
  { id: SERVICE_ID, price_type: "fixed", price: 1500000 },
];
const QUOTE: Services = [{ id: SERVICE_ID, price_type: "quote", price: null }];

function booking(overrides: Partial<OwnerBooking> = {}) {
  return {
    id: "b1",
    status: "confirmed",
    starts_at: "2026-10-16T08:00:00Z",
    ends_at: "2026-10-16T09:00:00Z",
    refund_due: null,
    payment_status: "paid",
    stylist: { id: "st1", name: "Ada" },
    service: { id: SERVICE_ID, name: "Braids", duration_minutes: 60 },
    client_name: "Ngozi O.",
    ...overrides,
  } as OwnerBooking;
}

function renderCard(b: OwnerBooking, services: Services = FIXED) {
  return render(
    <ul>
      <OwnerBookingCard booking={b} services={services} depositKobo={500000} />
    </ul>,
  );
}

describe("OwnerBookingCard", () => {
  it.each(["paid", "refund_pending", "refunded"] as const)(
    "shows the deposit amount when payment is %s",
    (payment_status) => {
      renderCard(booking({ payment_status }));
      expect(screen.getByText(/₦5,000 · /)).toBeInTheDocument();
    },
  );

  it.each([null, "pending", "failed"] as const)(
    "hides the deposit amount when payment is %s",
    (payment_status) => {
      renderCard(booking({ payment_status } as Partial<OwnerBooking>));
      expect(screen.queryByText(/₦5,000/)).not.toBeInTheDocument();
    },
  );

  it("shows the fixed price", () => {
    renderCard(booking());
    expect(screen.getByText("₦15,000")).toBeInTheDocument();
  });

  it("says Price on consultation for a quote service", () => {
    renderCard(booking(), QUOTE);
    expect(screen.getByText("Price on consultation")).toBeInTheDocument();
  });

  it("hides the price row when the service no longer exists", () => {
    renderCard(booking(), []);
    expect(screen.queryByText("Price")).not.toBeInTheDocument();
    expect(screen.queryByText(/₦15,000/)).not.toBeInTheDocument();
  });

  it("never shows an email", () => {
    renderCard(booking());
    expect(document.body.textContent).not.toMatch(/@/);
  });
});
