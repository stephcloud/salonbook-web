import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real hook returns undefined on the server and while the page hydrates,
// then the saved id. Here the test controls it.
let saved: string | null | undefined;
vi.mock("@/hooks/useSavedBookingId", () => ({
  useSavedBookingId: () => saved,
}));

const getBooking = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getBooking: (...args: unknown[]) => getBooking(...args),
}));

import type { BookingDetail } from "@/lib/api";
import { PaymentCallback } from "./PaymentCallback";

const ID = "69994867-62d8-480e-b4a6-6f8de65f75c4";

function booking(overrides: Partial<BookingDetail> = {}): BookingDetail {
  return {
    id: ID,
    client_id: "c1",
    stylist_id: "s1",
    service_id: "v1",
    starts_at: "2026-10-15T08:00:00Z",
    ends_at: "2026-10-15T09:00:00Z",
    status: "pending",
    refund_due: null,
    cancelled_at: null,
    created_at: "2026-10-11T09:28:55.605873Z",
    salon: {
      id: "salon-1",
      name: "Pink Studio",
      address: "12 Admiralty Way, Lekki",
      phone: "08012345678",
      cancellation_hours: 24,
      deposit_amount: 500000,
      image_url: null,
    },
    service: {
      id: "v1",
      name: "Box braids",
      duration_minutes: 60,
      price_type: "fixed",
      price: 1500000,
    },
    stylist: { id: "s1", name: "Amara", image_url: null },
    payment_status: "pending",
    payment_amount: 500000,
    ...overrides,
  };
}

function Page() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <PaymentCallback />
    </QueryClientProvider>
  );
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("PaymentCallback while the page hydrates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getBooking.mockReset();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("shows a neutral loading panel first, then the real first view without moving focus or announcing", async () => {
    saved = undefined;
    getBooking
      .mockResolvedValueOnce(booking())
      .mockResolvedValue(
        booking({ status: "confirmed", payment_status: "paid" }),
      );
    const { rerender } = render(<Page />);

    expect(
      screen.getByRole("heading", { name: "Loading..." }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Please wait while we confirm/)).toBeNull();
    expect(getBooking).not.toHaveBeenCalled();

    // Hydration finished: storage was read.
    saved = ID;
    rerender(<Page />);
    await advance(0);

    const confirming = screen.getByRole("heading", {
      name: "Confirming your payment",
    });
    expect(confirming).not.toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("");

    // A real change afterwards does move focus and announce.
    await advance(2500);
    const paid = screen.getByRole("heading", {
      name: "Payment received. Your booking is confirmed.",
    });
    expect(paid).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Payment received. Your booking is confirmed.",
    );
  });

  it("does not move focus when the first real view is 'nothing to confirm'", async () => {
    saved = undefined;
    const { rerender } = render(<Page />);
    saved = null;
    rerender(<Page />);
    await advance(0);

    const heading = screen.getByRole("heading", {
      name: "Nothing to confirm here",
    });
    expect(heading).not.toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(getBooking).not.toHaveBeenCalled();
  });
});
