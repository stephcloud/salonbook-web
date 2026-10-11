import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BookingListItem } from "@/lib/api";
import { BookingList } from "./BookingList";

const CREATED = "2026-10-11T09:00:00.000Z";
const CREATED_MS = Date.parse(CREATED);
const MINUTE = 60_000;

function item(
  id: string,
  overrides: Partial<BookingListItem> = {},
): BookingListItem {
  return {
    id,
    client_id: "c1",
    stylist_id: "s1",
    service_id: "v1",
    starts_at: "2026-10-15T08:00:00Z",
    ends_at: "2026-10-15T09:00:00Z",
    status: "pending",
    refund_due: null,
    cancelled_at: null,
    created_at: CREATED,
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
    ...overrides,
  };
}

describe("BookingList", () => {
  it("says 'No bookings yet' with a way to browse salons", () => {
    render(<BookingList bookings={[]} now={CREATED_MS} />);
    expect(screen.getByText("No bookings yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse salons" })).toHaveAttribute(
      "href",
      "/salons",
    );
  });

  it("shows salon, service, stylist and the time in Lagos time", () => {
    render(<BookingList bookings={[item("b1")]} now={CREATED_MS} />);
    expect(
      screen.getByRole("heading", { name: "Pink Studio" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Box braids")).toBeInTheDocument();
    expect(screen.getByText("with Amara")).toBeInTheDocument();
    expect(screen.getByText("Thu, 15 Oct 2026, 9:00 AM")).toBeInTheDocument();
  });

  it("labels each status", () => {
    render(
      <BookingList
        bookings={[
          item("b1", { status: "pending" }),
          item("b2", { status: "confirmed" }),
          item("b3", {
            status: "cancelled",
            cancelled_at: "2026-10-11T09:03:00.000Z",
          }),
          item("b4", { status: "completed" }),
          item("b5", { status: "no_show" }),
        ]}
        now={CREATED_MS}
      />,
    );
    const lists = screen.getAllByRole("listitem");
    expect(within(lists[0]).getByText("Awaiting payment")).toBeInTheDocument();
    expect(within(lists[1]).getByText("Confirmed")).toBeInTheDocument();
    expect(within(lists[2]).getByText("Cancelled")).toBeInTheDocument();
    expect(within(lists[3]).getByText("Completed")).toBeInTheDocument();
    expect(within(lists[4]).getByText("No show")).toBeInTheDocument();
  });

  it("shows an unpaid hold that ran out (cancelled by the API, no cancelled_at) as Expired", () => {
    render(
      <BookingList
        bookings={[item("b1", { status: "cancelled", cancelled_at: null })]}
        now={CREATED_MS}
      />,
    );
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.queryByText("Cancelled")).toBeNull();
  });

  it("offers Pay now only for a pending booking that is still held", () => {
    render(
      <BookingList
        bookings={[
          item("held"),
          item("confirmed", { status: "confirmed" }),
          item("cancelled", { status: "cancelled" }),
        ]}
        now={CREATED_MS + 5 * MINUTE}
      />,
    );
    const links = screen.getAllByRole("link", { name: "Pay now" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/bookings/held/pay");
  });

  it("does not offer Pay now once the 15 minutes are over", () => {
    render(
      <BookingList bookings={[item("late")]} now={CREATED_MS + 15 * MINUTE} />,
    );
    expect(screen.queryByRole("link", { name: "Pay now" })).toBeNull();
    expect(
      screen.getByText("The hold ended before the deposit was paid."),
    ).toBeInTheDocument();
  });
});
