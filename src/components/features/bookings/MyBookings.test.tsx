import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listBookings = vi.fn();
const cancelBooking = vi.fn();
const getBooking = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  listBookings: (...args: unknown[]) => listBookings(...args),
  cancelBooking: (...args: unknown[]) => cancelBooking(...args),
  getBooking: (...args: unknown[]) => getBooking(...args),
}));

import { ApiError, type BookingListItem } from "@/lib/api";
import { MyBookings } from "./MyBookings";
import { HOUR, MINUTE, NOW, makeBooking } from "./fixtures";

const CANCELLED_AT = "2026-10-11T12:00:00.000Z";

function renderPage(initial: BookingListItem[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MyBookings initialBookings={initial} serverNow={NOW} />
    </QueryClientProvider>,
  );
}

const upcomingPanel = () => screen.getByRole("tabpanel");

describe("MyBookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listBookings.mockResolvedValue([]);
  });

  describe("tabs", () => {
    const list = [
      makeBooking("far", "confirmed", {
        startsInMs: 72 * HOUR,
        serviceName: "Far service",
      }),
      makeBooking("soon", "confirmed", {
        startsInMs: 3 * HOUR,
        serviceName: "Soon service",
      }),
      makeBooking("held", "pending", {
        createdAgoMs: 2 * MINUTE,
        serviceName: "Held service",
      }),
      makeBooking("expired", "pending", {
        createdAgoMs: 30 * MINUTE,
        serviceName: "Expired service",
      }),
      makeBooking("cancelled", "cancelled", {
        startsInMs: 24 * HOUR,
        cancelledAt: CANCELLED_AT,
        refundDue: false,
        serviceName: "Cancelled service",
      }),
      makeBooking("done", "completed", {
        startsInMs: -48 * HOUR,
        serviceName: "Done service",
      }),
    ];

    it("counts each tab and starts on Upcoming", () => {
      renderPage(list);
      expect(screen.getByRole("tab", { name: "Upcoming (3)" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByRole("tab", { name: "Past (3)" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });

    it("lists Upcoming soonest first: bookings still active, including an unpaid hold that is running", () => {
      renderPage(list);
      const names = within(upcomingPanel())
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent);
      expect(names).toEqual(
        ["Held service", "Soon service", "Far service"].sort(
          (a, b) => order(a) - order(b),
        ),
      );
      function order(name: string) {
        return ["Soon service", "Held service", "Far service"].indexOf(name);
      }
    });

    it("puts cancelled, expired and finished bookings under Past, most recent first", async () => {
      const user = userEvent.setup();
      renderPage(list);
      await user.click(screen.getByRole("tab", { name: "Past (3)" }));

      const names = within(upcomingPanel())
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent);
      expect(names).toEqual(
        ["Cancelled service", "Expired service", "Done service"].sort(
          (a, b) =>
            ["Expired service", "Cancelled service", "Done service"].indexOf(
              a,
            ) -
            ["Expired service", "Cancelled service", "Done service"].indexOf(b),
        ),
      );
      expect(within(upcomingPanel()).getByText("Expired")).toBeInTheDocument();
      expect(
        within(upcomingPanel()).getByText("Cancelled"),
      ).toBeInTheDocument();
      expect(
        within(upcomingPanel()).getByText("Completed"),
      ).toBeInTheDocument();
    });

    it("does not offer Pay or Cancel on anything under Past", async () => {
      const user = userEvent.setup();
      renderPage(list);
      await user.click(screen.getByRole("tab", { name: "Past (3)" }));
      expect(
        within(upcomingPanel()).queryByRole("link", { name: /Pay now/ }),
      ).toBeNull();
      expect(
        within(upcomingPanel()).queryByRole("button", { name: /^Cancel / }),
      ).toBeNull();
    });

    it("says 'No upcoming bookings' with a way to browse salons when only past ones exist", () => {
      renderPage([
        makeBooking("done", "completed", { startsInMs: -48 * HOUR }),
      ]);
      expect(screen.getByText("No upcoming bookings")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Browse salons" }),
      ).toHaveAttribute("href", "/salons");
    });

    it("says 'No past bookings yet' when only upcoming ones exist", async () => {
      const user = userEvent.setup();
      renderPage([makeBooking("soon", "confirmed", { startsInMs: 3 * HOUR })]);
      await user.click(screen.getByRole("tab", { name: "Past (0)" }));
      expect(screen.getByText("No past bookings yet")).toBeInTheDocument();
    });

    it("shows 'No bookings yet' with a link to /salons, and no tabs, when there are none", () => {
      renderPage([]);
      expect(screen.getByText("No bookings yet")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Browse salons" }),
      ).toHaveAttribute("href", "/salons");
      expect(screen.queryByRole("tab")).toBeNull();
    });

    it("mentions the cap when the API returned a full page of 100", () => {
      const many = Array.from({ length: 100 }, (_, i) =>
        makeBooking(`b${i}`, "completed", { startsInMs: -(i + 2) * HOUR }),
      );
      renderPage(many);
      expect(
        screen.getByText("Showing your 100 latest bookings."),
      ).toBeInTheDocument();
    });
  });

  describe("cancelling", () => {
    const confirmed = () =>
      makeBooking("c1", "confirmed", { startsInMs: 72 * HOUR });

    async function openDialog(user: ReturnType<typeof userEvent.setup>) {
      await user.click(
        screen.getByRole("button", {
          name: "Cancel Box braids at Pink Studio",
        }),
      );
      return screen.getByRole("alertdialog", { name: "Cancel this booking?" });
    }

    it("asks first, explaining the rule with the salon's window", async () => {
      const user = userEvent.setup();
      renderPage([confirmed()]);
      const dialog = await openDialog(user);
      expect(
        within(dialog).getByText(
          /Refund only if you cancel more than 24 hours before/,
        ),
      ).toBeInTheDocument();
      expect(cancelBooking).not.toHaveBeenCalled();
    });

    it("cancels once, tells the client the refund outcome from refund_due, and moves the booking to Past", async () => {
      cancelBooking.mockResolvedValue({
        id: "c1",
        status: "cancelled",
        refund_due: true,
        cancelled_at: CANCELLED_AT,
      });
      listBookings.mockResolvedValue([
        makeBooking("c1", "cancelled", {
          startsInMs: 72 * HOUR,
          refundDue: true,
          cancelledAt: CANCELLED_AT,
        }),
      ]);
      getBooking.mockResolvedValue({ payment_status: "refund_pending" });
      const user = userEvent.setup();
      renderPage([confirmed()]);

      const dialog = await openDialog(user);
      await user.click(
        within(dialog).getByRole("button", { name: "Cancel booking" }),
      );

      expect(
        await screen.findByText(
          /is cancelled\. Your deposit will be refunded\./,
        ),
      ).toBeInTheDocument();
      expect(cancelBooking).toHaveBeenCalledTimes(1);
      expect(cancelBooking).toHaveBeenCalledWith("c1");
      expect(screen.queryByRole("alertdialog")).toBeNull();

      // The list is refreshed from the API and the booking is now under Past.
      await waitFor(() => expect(listBookings).toHaveBeenCalled());
      expect(
        screen.getByRole("tab", { name: "Upcoming (0)" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("tab", { name: "Past (1)" }));
      expect(
        within(upcomingPanel()).getByText("Cancelled"),
      ).toBeInTheDocument();
      expect(
        await within(upcomingPanel()).findByText("Refund pending"),
      ).toBeInTheDocument();
      expect(
        within(upcomingPanel()).getByText("Your refund is being processed."),
      ).toBeInTheDocument();
    });

    it("says there is no refund, naming the window, when the API says refund_due is false for a paid booking", async () => {
      cancelBooking.mockResolvedValue({
        id: "c1",
        status: "cancelled",
        refund_due: false,
        cancelled_at: CANCELLED_AT,
      });
      listBookings.mockResolvedValue([
        makeBooking("c1", "cancelled", {
          startsInMs: 72 * HOUR,
          refundDue: false,
          cancelledAt: CANCELLED_AT,
        }),
      ]);
      const user = userEvent.setup();
      renderPage([confirmed()]);
      const dialog = await openDialog(user);
      await user.click(
        within(dialog).getByRole("button", { name: "Cancel booking" }),
      );
      expect(
        await screen.findByText(
          /No refund, cancelled inside the 24-hour window\./,
        ),
      ).toBeInTheDocument();
    });

    it("says nothing was charged when an unpaid booking is cancelled", async () => {
      cancelBooking.mockResolvedValue({
        id: "p1",
        status: "cancelled",
        refund_due: false,
        cancelled_at: CANCELLED_AT,
      });
      listBookings.mockResolvedValue([
        makeBooking("p1", "cancelled", {
          refundDue: false,
          cancelledAt: CANCELLED_AT,
        }),
      ]);
      const user = userEvent.setup();
      renderPage([makeBooking("p1", "pending", { createdAgoMs: MINUTE })]);
      await user.click(
        screen.getByRole("button", {
          name: "Cancel Box braids at Pink Studio",
        }),
      );
      await user.click(screen.getByRole("button", { name: "Cancel booking" }));
      expect(
        await screen.findByText(/Nothing was charged\./),
      ).toBeInTheDocument();
    });

    it("keeps the booking and shows the reason when the API refuses, then refreshes the list", async () => {
      cancelBooking.mockRejectedValue(
        new ApiError(409, "This booking can no longer be cancelled."),
      );
      const user = userEvent.setup();
      renderPage([confirmed()]);
      const dialog = await openDialog(user);

      await user.click(
        within(dialog).getByRole("button", { name: "Cancel booking" }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "This booking can no longer be cancelled.",
      );
      await waitFor(() => expect(listBookings).toHaveBeenCalled());
    });

    it("does not cancel when the client keeps the booking", async () => {
      const user = userEvent.setup();
      renderPage([confirmed()]);
      const dialog = await openDialog(user);
      await user.click(
        within(dialog).getByRole("button", { name: "Keep booking" }),
      );
      expect(cancelBooking).not.toHaveBeenCalled();
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(
        screen.getByRole("tab", { name: "Upcoming (1)" }),
      ).toBeInTheDocument();
    });
  });

  describe("refund status of cancelled bookings", () => {
    const list = [
      makeBooking("r1", "cancelled", {
        startsInMs: 72 * HOUR,
        refundDue: true,
        cancelledAt: CANCELLED_AT,
        serviceName: "Refund one",
      }),
      makeBooking("r2", "cancelled", {
        startsInMs: 96 * HOUR,
        refundDue: true,
        cancelledAt: CANCELLED_AT,
        serviceName: "Refund two",
      }),
      makeBooking("n1", "cancelled", {
        startsInMs: 120 * HOUR,
        refundDue: false,
        cancelledAt: CANCELLED_AT,
        serviceName: "No refund",
      }),
      makeBooking("e1", "cancelled", {
        startsInMs: 24 * HOUR,
        refundDue: null,
        cancelledAt: null,
        serviceName: "Expired one",
      }),
    ];

    it("reads the detail only for cancelled bookings whose refund is due", async () => {
      getBooking.mockImplementation(async (id: string) => ({
        payment_status: id === "r1" ? "refund_pending" : "refunded",
      }));
      const user = userEvent.setup();
      renderPage(list);
      await user.click(screen.getByRole("tab", { name: "Past (4)" }));

      await waitFor(() => expect(getBooking).toHaveBeenCalledTimes(2));
      expect(getBooking.mock.calls.map((c) => c[0]).sort()).toEqual([
        "r1",
        "r2",
      ]);
    });

    it("shows Refund pending and Refunded, and the plain notes for the others", async () => {
      getBooking.mockImplementation(async (id: string) => ({
        payment_status: id === "r1" ? "refund_pending" : "refunded",
      }));
      const user = userEvent.setup();
      renderPage(list);
      await user.click(screen.getByRole("tab", { name: "Past (4)" }));

      expect(await screen.findByText("Refund pending")).toBeInTheDocument();
      expect(await screen.findByText("Refunded")).toBeInTheDocument();
      expect(
        screen.getByText("Your refund is being processed."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Your deposit was refunded."),
      ).toBeInTheDocument();
      expect(screen.getByText("No refund due.")).toBeInTheDocument();
      expect(screen.getByText("Expired")).toBeInTheDocument();
    });

    it("falls back to the refund_due text when the detail cannot be read", async () => {
      getBooking.mockRejectedValue(new TypeError("fetch failed"));
      const user = userEvent.setup();
      renderPage(list);
      await user.click(screen.getByRole("tab", { name: "Past (4)" }));
      await waitFor(() => expect(getBooking).toHaveBeenCalled());
      expect(
        screen.getAllByText("Your deposit will be refunded."),
      ).toHaveLength(2);
      expect(screen.queryByText("Refund pending")).toBeNull();
    });
  });

  describe("refreshing", () => {
    it("keeps the list and offers Retry when a refresh fails", async () => {
      cancelBooking.mockResolvedValue({
        id: "c1",
        status: "cancelled",
        refund_due: true,
        cancelled_at: CANCELLED_AT,
      });
      listBookings.mockRejectedValueOnce(new TypeError("fetch failed"));
      listBookings.mockResolvedValue([]);
      const user = userEvent.setup();
      renderPage([makeBooking("c1", "confirmed", { startsInMs: 72 * HOUR })]);
      await user.click(
        screen.getByRole("button", {
          name: "Cancel Box braids at Pink Studio",
        }),
      );
      await user.click(screen.getByRole("button", { name: "Cancel booking" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("We could not refresh your bookings.");
      // The cancelled booking is still shown from the API's answer.
      expect(screen.getByRole("tab", { name: "Past (1)" })).toBeInTheDocument();

      await user.click(within(alert).getByRole("button", { name: "Retry" }));
      await waitFor(() => expect(listBookings).toHaveBeenCalledTimes(2));
    });
  });
});

describe("MyBookings clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.setSystemTime(NOW);
    listBookings.mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
      await vi.advanceTimersByTimeAsync(1);
      await vi.advanceTimersByTimeAsync(0);
    });
  }

  it("counts the hold down every second", async () => {
    renderPage([makeBooking("h1", "pending", { createdAgoMs: 2 * MINUTE })]);
    expect(screen.getByText("Time left to pay: 13:00")).toBeInTheDocument();
    await advance(5000);
    expect(screen.getByText(/Time left to pay: 12:5[4-5]/)).toBeInTheDocument();
  });

  it("moves an unpaid booking to Past as Expired when its 15 minutes end, and asks the API once", async () => {
    listBookings.mockResolvedValue([
      makeBooking("h1", "cancelled", {
        createdAgoMs: 16 * MINUTE,
        cancelledAt: null,
      }),
    ]);
    renderPage([makeBooking("h1", "pending", { createdAgoMs: 14 * MINUTE })]);
    expect(
      screen.getByRole("tab", { name: "Upcoming (1)" }),
    ).toBeInTheDocument();
    expect(listBookings).not.toHaveBeenCalled();

    await advance(MINUTE + 2000);

    expect(
      screen.getByRole("tab", { name: "Upcoming (0)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Past (1)" })).toBeInTheDocument();
    expect(listBookings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: /Pay now/ })).toBeNull();
  });
});
