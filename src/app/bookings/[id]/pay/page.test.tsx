import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

const requireUser = vi.fn();
const getMyBooking = vi.fn();
vi.mock("@/lib/api-server", () => ({
  requireUser: (next: string) => requireUser(next),
  getMyBooking: (id: string) => getMyBooking(id),
  loginRedirectUrl: (next: string) => `/login?next=${encodeURIComponent(next)}`,
}));

import { ApiError, type BookingDetail } from "@/lib/api";
import PayBookingPage from "./page";

const ID = "69994867-62d8-480e-b4a6-6f8de65f75c4";
const CREATED = "2026-10-11T09:00:00.000Z";

const booking: BookingDetail = {
  id: ID,
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
  payment_status: null,
  payment_amount: null,
};

const props = (id = ID) =>
  ({ params: Promise.resolve({ id }) }) as unknown as Parameters<
    typeof PayBookingPage
  >[0];

describe("PayBookingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "c1", role: "client" });
    getMyBooking.mockResolvedValue({
      booking,
      serverNow: Date.parse(CREATED) + 5 * 60_000,
    });
  });

  it("requires sign-in and returns to the same pay path", async () => {
    await PayBookingPage(props());
    expect(requireUser).toHaveBeenCalledWith(`/bookings/${ID}/pay`);
  });

  it("sends a signed-out visitor to login without reading the booking", async () => {
    requireUser.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect(PayBookingPage(props())).rejects.toThrow("NEXT_REDIRECT");
    expect(getMyBooking).not.toHaveBeenCalled();
  });

  it("shows the booking with a countdown inside the main landmark", async () => {
    render(await PayBookingPage(props()));
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", { name: "Pay your deposit" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pink Studio")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("10:00");
    expect(screen.getByRole("button", { name: "Pay deposit" })).toBeEnabled();
    expect(getMyBooking).toHaveBeenCalledWith(ID);
  });

  it.each([403, 404, 422])(
    "shows a friendly message when the API answers %i",
    async (status) => {
      getMyBooking.mockRejectedValue(new ApiError(status, "nope"));
      render(await PayBookingPage(props()));
      expect(
        screen.getByRole("heading", { name: "We could not find this booking" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "My Bookings" })).toHaveAttribute(
        "href",
        "/bookings",
      );
      expect(screen.queryByRole("button", { name: "Pay deposit" })).toBeNull();
    },
  );

  it("sends the client to login with this page as next on a 401", async () => {
    getMyBooking.mockRejectedValue(new ApiError(401, "Please sign in again."));
    await expect(PayBookingPage(props())).rejects.toThrow(
      `NEXT_REDIRECT:/login?next=${encodeURIComponent(`/bookings/${ID}/pay`)}`,
    );
  });

  it("lets a server error through so the retry screen shows", async () => {
    getMyBooking.mockRejectedValue(new ApiError(500, "boom"));
    await expect(PayBookingPage(props())).rejects.toMatchObject({
      status: 500,
    });
  });
});
