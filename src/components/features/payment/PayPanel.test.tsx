import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getBooking = vi.fn();
const payBooking = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getBooking: (...args: unknown[]) => getBooking(...args),
  payBooking: (...args: unknown[]) => payBooking(...args),
}));

const leaveTo = vi.fn();
vi.mock("@/lib/navigate", () => ({ leaveTo: (url: string) => leaveTo(url) }));

import { ApiError, type BookingDetail } from "@/lib/api";
import { PayPanel } from "./PayPanel";

const ID = "69994867-62d8-480e-b4a6-6f8de65f75c4";
const STORAGE_KEY = "sb_pending_booking";
const CREATED = "2026-10-11T09:00:00.000Z";
const CREATED_MS = Date.parse(CREATED);
const MINUTE = 60_000;
const CHECKOUT = "https://checkout.paystack.com/8aaow7bva6qwfi3";

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
    ...overrides,
  };
}

function payment(authorizationUrl: string | null = CHECKOUT) {
  return {
    id: "pay-1",
    booking_id: ID,
    amount: 500000,
    currency: "NGN",
    status: "pending",
    paystack_reference: "sb_abc",
    authorization_url: authorizationUrl,
    created_at: "2026-10-11T09:05:00.000Z",
  };
}

/** Renders the panel as if the server read the booking `minutesIn` minutes after it was created. */
function renderPanel(
  initial: BookingDetail = booking(),
  { minutesIn = 5, deviceOffsetMs = 0 } = {},
) {
  const serverNow = CREATED_MS + minutesIn * MINUTE;
  vi.setSystemTime(serverNow + deviceOffsetMs);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PayPanel initialBooking={initial} serverNow={serverNow} />
    </QueryClientProvider>,
  );
}

async function flush() {
  await vi.advanceTimersByTimeAsync(1);
  await vi.advanceTimersByTimeAsync(0);
}
async function settle() {
  await act(async () => {
    await flush();
  });
}
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    await flush();
  });
  // React applies state changes when act ends, so an effect they trigger (such
  // as the re-read at zero) starts now; let it finish and render.
  await settle();
}
async function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
  await settle();
}

describe("PayPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getBooking.mockReset();
    payBooking.mockReset();
    leaveTo.mockReset();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  describe("the booking and the countdown", () => {
    it("shows the booking: salon, service, stylist, Lagos time, price and deposit", () => {
      renderPanel();
      expect(
        screen.getByRole("heading", { name: "Pay your deposit" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Pink Studio")).toBeInTheDocument();
      expect(screen.getByText("Box braids")).toBeInTheDocument();
      expect(screen.getByText("Amara")).toBeInTheDocument();
      expect(screen.getByText("Thu, 15 Oct 2026, 9:00 AM")).toBeInTheDocument();
      expect(screen.getByText("₦15,000")).toBeInTheDocument();
      expect(screen.getByText("₦5,000")).toBeInTheDocument();
      expect(
        screen.getByText(/Refund only if you cancel more than 24 hours before/),
      ).toBeInTheDocument();
    });

    it("shows 'Price on consultation' for a quote service", () => {
      renderPanel(
        booking({
          service: {
            id: "v1",
            name: "Custom colour",
            duration_minutes: 120,
            price_type: "quote",
            price: null,
          },
        }),
      );
      expect(screen.getByText("Price on consultation")).toBeInTheDocument();
      expect(screen.getByText("₦5,000")).toBeInTheDocument();
    });

    it("counts from the booking's own timestamp, not from when the page opened", () => {
      renderPanel(booking(), { minutesIn: 5 });
      expect(screen.getByRole("timer")).toHaveTextContent("10:00");
    });

    it("counts down every second", async () => {
      renderPanel(booking(), { minutesIn: 14 });
      expect(screen.getByRole("timer")).toHaveTextContent("1:00");
      await advance(1000);
      expect(screen.getByRole("timer")).toHaveTextContent("0:59");
      await advance(9000);
      expect(screen.getByRole("timer")).toHaveTextContent("0:50");
    });

    it("is right even when the device clock is wrong", async () => {
      // The device is 4 minutes behind the server.
      renderPanel(booking(), { minutesIn: 5, deviceOffsetMs: -4 * MINUTE });
      await settle();
      expect(screen.getByRole("timer")).toHaveTextContent("10:00");
      await advance(MINUTE);
      expect(screen.getByRole("timer")).toHaveTextContent("9:00");
    });

    it("announces the last minute to screen readers", async () => {
      renderPanel(booking(), { minutesIn: 13 });
      expect(screen.queryByText("Less than a minute left to pay.")).toBeNull();
      await advance(MINUTE + 1000);
      expect(
        screen.getByText("Less than a minute left to pay."),
      ).toBeInTheDocument();
    });

    it("keeps Pay available when a payment was started but the booking is still pending", () => {
      renderPanel(
        booking({ payment_status: "pending", payment_amount: 500000 }),
      );
      expect(screen.getByRole("button", { name: "Pay deposit" })).toBeEnabled();
    });

    it("says so when the last payment failed, and still allows another try", () => {
      renderPanel(booking({ payment_status: "failed" }));
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Your last payment did not go through",
      );
      expect(screen.getByRole("button", { name: "Pay deposit" })).toBeEnabled();
    });
  });

  describe("when the hold ends or the booking is no longer pending", () => {
    it("shows 'this hold expired' with a link back to the salon when the countdown ends", async () => {
      getBooking.mockResolvedValue(booking());
      renderPanel(booking(), { minutesIn: 14 });
      await advance(58_000);
      // A couple of ms of test flushing can tip 0:02 into 0:01.
      expect(screen.getByRole("timer")).toHaveTextContent(/^0:0[12]$/);
      expect(
        screen.queryByRole("heading", { name: "This hold expired" }),
      ).toBeNull();

      await advance(2000);
      expect(
        screen.getByRole("heading", { name: "This hold expired" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Back to Pink Studio" }),
      ).toHaveAttribute("href", "/salons/salon-1");
      expect(screen.queryByRole("button", { name: "Pay deposit" })).toBeNull();
      expect(screen.queryByRole("timer")).toBeNull();
    });

    it("re-reads the booking once when the countdown ends instead of trusting the clock", async () => {
      getBooking.mockResolvedValue(booking());
      renderPanel(booking(), { minutesIn: 14 });
      await advance(MINUTE + 5000);
      expect(getBooking).toHaveBeenCalledTimes(1);
      expect(getBooking).toHaveBeenCalledWith(ID);
    });

    it("shows the booking as confirmed if it was paid at the last second", async () => {
      getBooking.mockResolvedValue(
        booking({ status: "confirmed", payment_status: "paid" }),
      );
      renderPanel(booking(), { minutesIn: 14 });
      await advance(MINUTE + 1000);
      expect(
        screen.getByRole("heading", { name: "Your booking is confirmed" }),
      ).toBeInTheDocument();
    });

    it("calls an unpaid hold the API cancelled by itself expired, even if opened within 15 minutes", () => {
      // Live API: expiry sets status "cancelled" and leaves cancelled_at empty.
      renderPanel(booking({ status: "cancelled", cancelled_at: null }), {
        minutesIn: 3,
      });
      expect(
        screen.getByRole("heading", { name: "This hold expired" }),
      ).toBeInTheDocument();
    });

    it("still says cancelled when the client cancelled and the page opens after 15 minutes", () => {
      renderPanel(
        booking({
          status: "cancelled",
          cancelled_at: "2026-10-11T09:03:00.000Z",
        }),
        { minutesIn: 20 },
      );
      expect(
        screen.getByRole("heading", { name: "This booking was cancelled" }),
      ).toBeInTheDocument();
    });

    it("is expired straight away when opened after the hold ended", async () => {
      getBooking.mockResolvedValue(booking({ status: "cancelled" }));
      renderPanel(booking({ status: "cancelled" }), { minutesIn: 20 });
      await settle();
      expect(
        screen.getByRole("heading", { name: "This hold expired" }),
      ).toBeInTheDocument();
    });

    it("shows an already confirmed booking as confirmed, with no Pay button", () => {
      renderPanel(booking({ status: "confirmed", payment_status: "paid" }));
      expect(
        screen.getByRole("heading", { name: "Your booking is confirmed" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "View my bookings" }),
      ).toHaveAttribute("href", "/bookings");
      expect(screen.queryByRole("button", { name: "Pay deposit" })).toBeNull();
      expect(screen.queryByRole("timer")).toBeNull();
    });

    it("says a booking the client cancelled was cancelled", () => {
      renderPanel(
        booking({
          status: "cancelled",
          cancelled_at: "2026-10-11T09:03:00.000Z",
        }),
        { minutesIn: 3 },
      );
      expect(
        screen.getByRole("heading", { name: "This booking was cancelled" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Pay deposit" })).toBeNull();
    });
  });

  describe("the Pay button", () => {
    it("starts the payment, saves the booking id, then goes to Paystack", async () => {
      payBooking.mockResolvedValue(payment());
      // The id must already be saved at the moment we leave.
      leaveTo.mockImplementation(() => {
        expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe(ID);
      });
      renderPanel();

      await click("Pay deposit");

      expect(payBooking).toHaveBeenCalledWith(ID);
      expect(leaveTo).toHaveBeenCalledWith(CHECKOUT);
      expect(
        screen.getByRole("button", { name: "Taking you to Paystack..." }),
      ).toBeDisabled();
    });

    it("sends one request when clicked twice before React re-renders", async () => {
      payBooking.mockReturnValue(new Promise(() => {}));
      renderPanel();

      const button = screen.getByRole("button", { name: "Pay deposit" });
      act(() => {
        fireEvent.click(button);
        fireEvent.click(button);
      });
      await settle();

      expect(payBooking).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole("button", { name: "Starting payment..." }),
      ).toBeDisabled();
    });

    it("stays disabled after success so it cannot start a second payment", async () => {
      payBooking.mockResolvedValue(payment());
      renderPanel();
      await click("Pay deposit");

      fireEvent.click(
        screen.getByRole("button", { name: "Taking you to Paystack..." }),
      );
      await settle();
      expect(payBooking).toHaveBeenCalledTimes(1);
      expect(leaveTo).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["a link on another site", "https://evil.example.com/pay"],
      ["a plain http link", "http://checkout.paystack.com/abc"],
      ["no link at all", null],
    ])("does not follow %s and saves nothing", async (_name, url) => {
      payBooking.mockResolvedValue(payment(url));
      renderPanel();

      await click("Pay deposit");

      expect(leaveTo).not.toHaveBeenCalled();
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We could not open the payment page",
      );
      expect(screen.getByRole("button", { name: "Pay deposit" })).toBeEnabled();
    });

    it("re-reads the booking and shows what happened when it can no longer be paid", async () => {
      payBooking.mockRejectedValue(
        new ApiError(409, "This booking can no longer be paid for."),
      );
      getBooking.mockResolvedValue(
        booking({
          status: "cancelled",
          cancelled_at: "2026-10-11T09:02:00.000Z",
        }),
      );
      renderPanel(booking(), { minutesIn: 3 });

      await click("Pay deposit");

      expect(getBooking).toHaveBeenCalledWith(ID);
      expect(
        screen.getByRole("heading", { name: "This booking was cancelled" }),
      ).toBeInTheDocument();
      expect(leaveTo).not.toHaveBeenCalled();
    });

    it("shows the message when the booking is still pending after a 409", async () => {
      payBooking.mockRejectedValue(
        new ApiError(409, "This booking can no longer be paid for."),
      );
      getBooking.mockResolvedValue(booking());
      renderPanel();
      await click("Pay deposit");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This booking can no longer be paid for.",
      );
    });

    it("gives a friendly message when the booking is not the client's (403)", async () => {
      payBooking.mockRejectedValue(new ApiError(403, "forbidden"));
      renderPanel();
      await click("Pay deposit");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We could not find this booking in your account.",
      );
    });

    it("stays disabled and quiet on a 401 while the login redirect happens", async () => {
      payBooking.mockRejectedValue(new ApiError(401, "Please sign in again."));
      renderPanel();
      await click("Pay deposit");
      expect(screen.queryByRole("alert")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Redirecting you to sign in..." }),
      ).toBeDisabled();
    });

    it("hides raw server text on a 5xx and lets the client try again", async () => {
      payBooking
        .mockRejectedValueOnce(
          new ApiError(500, "Traceback (most recent call last)"),
        )
        .mockResolvedValueOnce(payment());
      renderPanel();

      await click("Pay deposit");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We could not start the payment. Please try again.",
      );
      expect(screen.queryByText(/Traceback/)).toBeNull();

      await click("Pay deposit");
      expect(leaveTo).toHaveBeenCalledWith(CHECKOUT);
      expect(payBooking).toHaveBeenCalledTimes(2);
    });

    it("explains a network failure and lets the client try again", async () => {
      payBooking.mockRejectedValueOnce(new TypeError("fetch failed"));
      renderPanel();
      await click("Pay deposit");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not reach the server",
      );
      expect(screen.getByRole("button", { name: "Pay deposit" })).toBeEnabled();
    });
  });
});
