import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

const requireUser = vi.fn();
const getMyBookings = vi.fn();
vi.mock("@/lib/api-server", () => ({
  requireUser: (next: string) => requireUser(next),
  getMyBookings: () => getMyBookings(),
  loginRedirectUrl: (next: string) => `/login?next=${encodeURIComponent(next)}`,
}));

import { ApiError } from "@/lib/api";
import BookingsPage from "./page";

describe("BookingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "c1", role: "client" });
    getMyBookings.mockResolvedValue({ bookings: [], serverNow: Date.now() });
  });

  it("requires sign-in and returns to /bookings", async () => {
    await BookingsPage();
    expect(requireUser).toHaveBeenCalledWith("/bookings");
  });

  it("shows the empty state inside the main landmark", async () => {
    render(await BookingsPage());
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", { level: 1, name: "My bookings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No bookings yet")).toBeInTheDocument();
  });

  it("shows the Upcoming and Past tabs with the client bookings", async () => {
    const now = Date.parse("2026-10-11T12:00:00Z");
    const booking = (
      id: string,
      status: "confirmed" | "cancelled",
      hours: number,
    ) => ({
      id,
      client_id: "c1",
      stylist_id: "s1",
      service_id: `v-${id}`,
      starts_at: new Date(now + hours * 3_600_000).toISOString(),
      ends_at: new Date(now + (hours + 1) * 3_600_000).toISOString(),
      status,
      refund_due: null,
      cancelled_at: status === "cancelled" ? "2026-10-11T10:00:00.000Z" : null,
      created_at: "2026-10-11T09:00:00.000Z",
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
        id: `v-${id}`,
        name: "Box braids",
        duration_minutes: 60,
        price_type: "fixed" as const,
        price: 1500000,
      },
      stylist: { id: "s1", name: "Amara", image_url: null },
    });
    getMyBookings.mockResolvedValue({
      bookings: [booking("a", "confirmed", 48), booking("b", "cancelled", 72)],
      serverNow: now,
    });

    render(await BookingsPage());

    expect(
      screen.getByRole("tab", { name: "Upcoming (1)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Past (1)" })).toBeInTheDocument();
  });

  it("tells owners it is for clients, without reading bookings", async () => {
    requireUser.mockResolvedValue({ id: "o1", role: "owner" });
    render(await BookingsPage());
    expect(
      screen.getByRole("heading", { name: "Booking is for clients" }),
    ).toBeInTheDocument();
    expect(getMyBookings).not.toHaveBeenCalled();
  });

  it("sends a 401 to login with this page as next", async () => {
    getMyBookings.mockRejectedValue(new ApiError(401, "Please sign in again."));
    await expect(BookingsPage()).rejects.toThrow(
      `NEXT_REDIRECT:/login?next=${encodeURIComponent("/bookings")}`,
    );
  });

  it("lets a server error through so the retry screen shows", async () => {
    getMyBookings.mockRejectedValue(new ApiError(502, "down"));
    await expect(BookingsPage()).rejects.toMatchObject({ status: 502 });
  });
});
