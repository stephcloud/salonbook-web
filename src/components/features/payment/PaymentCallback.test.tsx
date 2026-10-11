import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getBooking = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getBooking: (...args: unknown[]) => getBooking(...args),
}));

import { ApiError, type BookingDetail } from "@/lib/api";
import { PaymentCallback } from "./PaymentCallback";

const ID = "69994867-62d8-480e-b4a6-6f8de65f75c4";
const OTHER_ID = "11111111-1111-4111-8111-111111111111";
const STORAGE_KEY = "sb_pending_booking";

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

const pending = () => booking();
const confirmed = () =>
  booking({ status: "confirmed", payment_status: "paid" });

function renderCallback() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PaymentCallback />
    </QueryClientProvider>,
  );
}

/**
 * TanStack Query hands results to React through a zero-delay timer, which the
 * fake clock fires 1 ms later. Advancing 1 ms lets a result that arrived on the
 * last tick render. Timing checks below therefore use windows, not exact ms.
 */
async function flush() {
  await vi.advanceTimersByTimeAsync(1);
  await vi.advanceTimersByTimeAsync(0);
}

/** Let effects and the first fetch run. */
async function settle() {
  await act(async () => {
    await flush();
  });
}

/** Move the fake clock, then let any fetch that started on the last tick render. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    await flush();
  });
}

describe("PaymentCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getBooking.mockReset();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/payment/callback");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("which booking it checks", () => {
    it("uses the id from sessionStorage and ignores everything in the URL", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      window.history.replaceState(
        {},
        "",
        `/payment/callback?booking=${OTHER_ID}&reference=sb_x&trxref=sb_x&status=success`,
      );
      getBooking.mockResolvedValue(pending());

      renderCallback();
      await settle();
      await advance(4000);

      expect(getBooking).toHaveBeenCalled();
      for (const call of getBooking.mock.calls) {
        expect(call[0]).toBe(ID);
      }
      expect(getBooking).not.toHaveBeenCalledWith(OTHER_ID);
    });

    it("does not show success just because the URL says the payment succeeded", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      window.history.replaceState(
        {},
        "",
        "/payment/callback?status=success&reference=sb_x",
      );
      getBooking.mockResolvedValue(pending());

      renderCallback();
      await settle();
      await advance(6000);

      expect(
        screen.getByRole("heading", { name: "Confirming your payment" }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/booking is confirmed/i)).toBeNull();
    });

    it("explains what to do when nothing is saved, without calling the API", async () => {
      renderCallback();
      await settle();

      expect(
        screen.getByRole("heading", {
          name: "Nothing to confirm here",
        }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "My bookings" })).toHaveAttribute(
        "href",
        "/bookings",
      );
      expect(getBooking).not.toHaveBeenCalled();
    });

    it("treats a saved value that is not a booking id as empty", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, "../../something");
      renderCallback();
      await settle();

      expect(
        screen.getByRole("heading", {
          name: "Nothing to confirm here",
        }),
      ).toBeInTheDocument();
      expect(getBooking).not.toHaveBeenCalled();
    });
  });

  describe("polling", () => {
    it("checks right away and then every 2 seconds, not sooner", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking.mockResolvedValue(pending());

      renderCallback();
      await settle();
      expect(getBooking).toHaveBeenCalledTimes(1);

      await advance(1500);
      expect(getBooking).toHaveBeenCalledTimes(1);
      await advance(600);
      expect(getBooking).toHaveBeenCalledTimes(2);

      await advance(1500);
      expect(getBooking).toHaveBeenCalledTimes(2);
      await advance(600);
      expect(getBooking).toHaveBeenCalledTimes(3);
    });

    it("shows the confirming state while it waits", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking.mockResolvedValue(pending());
      renderCallback();
      await settle();

      expect(
        screen.getByRole("heading", { name: "Confirming your payment" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Please wait while we confirm your payment/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Please do not pay again/)).toBeInTheDocument();
    });

    it("stops polling as soon as the booking is confirmed, and clears the saved id", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking
        .mockResolvedValueOnce(pending())
        .mockResolvedValueOnce(pending())
        .mockResolvedValue(confirmed());

      renderCallback();
      await settle();
      await advance(4000);

      expect(
        screen.getByRole("heading", {
          name: "Payment received. Your booking is confirmed.",
        }),
      ).toBeInTheDocument();
      expect(screen.getByText("Pink Studio")).toBeInTheDocument();
      expect(screen.getByText("Box braids")).toBeInTheDocument();
      expect(screen.getByText("(1 hr)")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "View my bookings" }),
      ).toHaveAttribute("href", "/bookings");
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();

      const callsAtSuccess = getBooking.mock.calls.length;
      await advance(30_000);
      expect(getBooking).toHaveBeenCalledTimes(callsAtSuccess);
    });

    it("stops after 60 seconds with a calm message and keeps the saved id", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking.mockResolvedValue(pending());

      renderCallback();
      await settle();
      await advance(59_000);
      expect(
        screen.getByRole("heading", { name: "Confirming your payment" }),
      ).toBeInTheDocument();

      await advance(1000);
      expect(
        screen.getByRole("heading", {
          name: "Your payment is still being processed",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Check My bookings in a minute/),
      ).toBeInTheDocument();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe(ID);

      const callsAtTimeout = getBooking.mock.calls.length;
      expect(callsAtTimeout).toBeLessThanOrEqual(32);
      await advance(60_000);
      expect(getBooking).toHaveBeenCalledTimes(callsAtTimeout);
    });

    it("starts checking again when asked after the time limit", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking.mockResolvedValue(pending());

      renderCallback();
      await settle();
      await advance(60_000);
      const callsAtTimeout = getBooking.mock.calls.length;

      getBooking.mockResolvedValue(confirmed());
      fireEvent.click(screen.getByRole("button", { name: "Check again" }));
      await settle();

      expect(getBooking.mock.calls.length).toBeGreaterThan(callsAtTimeout);
      expect(
        screen.getByRole("heading", {
          name: "Payment received. Your booking is confirmed.",
        }),
      ).toBeInTheDocument();
    });

    it("stops polling when the page is left", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking.mockResolvedValue(pending());

      const { unmount } = renderCallback();
      await settle();
      await advance(4000);
      const callsBefore = getBooking.mock.calls.length;
      expect(callsBefore).toBeGreaterThanOrEqual(3);

      unmount();
      await advance(120_000);

      expect(getBooking).toHaveBeenCalledTimes(callsBefore);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("keeps trying through a network error and says so quietly", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking
        .mockRejectedValueOnce(new TypeError("fetch failed"))
        .mockResolvedValue(confirmed());

      renderCallback();
      await settle();
      expect(
        screen.getByText(/having trouble reaching the server/i),
      ).toBeInTheDocument();
      expect(screen.queryByRole("alert")).toBeNull();

      await advance(2000);
      expect(
        screen.getByRole("heading", {
          name: "Payment received. Your booking is confirmed.",
        }),
      ).toBeInTheDocument();
    });
  });

  describe("outcomes", () => {
    it("tells the client how to try again once the payment has stayed failed", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking.mockResolvedValue(booking({ payment_status: "failed" }));

      renderCallback();
      await settle();
      // Not yet: a retry may still be about to succeed.
      expect(
        screen.getByRole("heading", { name: "Confirming your payment" }),
      ).toBeInTheDocument();

      await advance(12_000);

      expect(
        screen.getByRole("heading", {
          name: "Your payment did not go through",
        }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
        "href",
        `/bookings/${ID}/pay`,
      );
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("shows success, not failure, when an earlier failed read is followed by paid", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking
        .mockResolvedValueOnce(booking({ payment_status: "failed" }))
        .mockResolvedValue(confirmed());

      renderCallback();
      await settle();
      await advance(2500);

      expect(
        screen.queryByRole("heading", {
          name: "Your payment did not go through",
        }),
      ).toBeNull();
      expect(
        screen.getByRole("heading", {
          name: "Payment received. Your booking is confirmed.",
        }),
      ).toBeInTheDocument();
    });

    it("says the booking is closed when it was cancelled or the hold ended", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking.mockResolvedValue(booking({ status: "cancelled" }));

      renderCallback();
      await settle();

      expect(
        screen.getByRole("heading", { name: "This booking is no longer open" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/please contact Pink Studio/),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "08012345678" })).toHaveAttribute(
        "href",
        "tel:08012345678",
      );
      expect(screen.getByRole("link", { name: "Book again" })).toHaveAttribute(
        "href",
        "/book/salon-1",
      );
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it.each([403, 404])(
      "shows a friendly message and stops when the API answers %i",
      async (status) => {
        window.sessionStorage.setItem(STORAGE_KEY, ID);
        getBooking.mockRejectedValue(new ApiError(status, "nope"));

        renderCallback();
        await settle();
        await advance(10_000);

        expect(
          screen.getByRole("heading", {
            name: "This booking is not on your account",
          }),
        ).toBeInTheDocument();
        expect(getBooking).toHaveBeenCalledTimes(1);
        expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
      },
    );
  });

  describe("for people using a screen reader or keyboard", () => {
    it("moves focus to the result heading and announces it when the result arrives", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking
        .mockResolvedValueOnce(pending())
        .mockResolvedValue(confirmed());

      renderCallback();
      await settle();
      // First paint: nothing is announced and focus is not moved.
      expect(screen.getByRole("status")).toHaveTextContent("");
      expect(
        screen.getByRole("heading", { name: "Confirming your payment" }),
      ).not.toHaveFocus();

      await advance(2500);

      const heading = screen.getByRole("heading", {
        name: "Payment received. Your booking is confirmed.",
      });
      expect(heading).toHaveFocus();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Payment received. Your booking is confirmed.",
      );
    });

    it("labels the deposit as paid on the success screen", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking.mockResolvedValue(confirmed());
      renderCallback();
      await settle();
      expect(screen.getByText("Deposit paid")).toBeInTheDocument();
    });

    it("says it is sending the client to sign in on a 401, and keeps the saved id", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, ID);
      getBooking.mockRejectedValue(new ApiError(401, "Please sign in again."));

      renderCallback();
      await settle();
      await advance(10_000);

      expect(
        screen.getByRole("heading", { name: "Redirecting you to sign in" }),
      ).toBeInTheDocument();
      expect(getBooking).toHaveBeenCalledTimes(1);
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe(ID);
      expect(screen.queryByText(/having trouble/i)).toBeNull();
    });
  });
});
