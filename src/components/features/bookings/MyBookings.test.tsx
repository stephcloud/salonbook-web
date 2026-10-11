import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listBookings = vi.fn();
const cancelBooking = vi.fn();
const getBooking = vi.fn();
const fetchClockSkew = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  listBookings: (...args: unknown[]) => listBookings(...args),
  cancelBooking: (...args: unknown[]) => cancelBooking(...args),
  getBooking: (...args: unknown[]) => getBooking(...args),
  fetchClockSkew: () => fetchClockSkew(),
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

const panel = () => screen.getByRole("tabpanel");
const headings = () =>
  within(panel())
    .getAllByRole("heading", { level: 2 })
    .map((h) => h.textContent);

function cancelResponse(id: string, refundDue: boolean | null) {
  return {
    id,
    status: "cancelled",
    refund_due: refundDue,
    cancelled_at: CANCELLED_AT,
  };
}

describe("MyBookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listBookings.mockResolvedValue([]);
    getBooking.mockResolvedValue({ payment_status: null });
    fetchClockSkew.mockResolvedValue(null);
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
        startsInMs: 5 * HOUR,
        serviceName: "Held service",
      }),
      makeBooking("expired", "pending", {
        createdAgoMs: 30 * MINUTE,
        startsInMs: 20 * HOUR,
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

    it("lists Upcoming soonest first: Soon (in 3 h), Held (in 5 h), Far (in 72 h)", () => {
      renderPage(list);
      expect(headings()).toEqual([
        "Soon service",
        "Held service",
        "Far service",
      ]);
    });

    it("puts cancelled, expired and finished bookings under Past, latest start first: Cancelled (+24 h), Expired (+20 h), Done (-48 h)", async () => {
      const user = userEvent.setup();
      renderPage(list);
      await user.click(screen.getByRole("tab", { name: "Past (3)" }));

      expect(headings()).toEqual([
        "Cancelled service",
        "Expired service",
        "Done service",
      ]);
      expect(within(panel()).getByText("Expired")).toBeInTheDocument();
      expect(within(panel()).getByText("Cancelled")).toBeInTheDocument();
      expect(within(panel()).getByText("Completed")).toBeInTheDocument();
    });

    it("does not offer Pay or Cancel on anything under Past", async () => {
      const user = userEvent.setup();
      renderPage(list);
      await user.click(screen.getByRole("tab", { name: "Past (3)" }));
      expect(
        within(panel()).queryByRole("link", { name: /Pay now/ }),
      ).toBeNull();
      expect(
        within(panel()).queryByRole("button", { name: /^Cancel booking/ }),
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

    it("gives the tabs a 44px height, readable inactive text, a filled active tab and a visible focus ring", () => {
      renderPage(list);
      const active = screen.getByRole("tab", { name: "Upcoming (3)" });
      const inactive = screen.getByRole("tab", { name: "Past (3)" });
      for (const tab of [active, inactive]) {
        expect(tab.className).toContain("min-h-11");
        expect(tab.className).toContain("h-auto");
        expect(tab.className).toContain("text-muted-foreground");
        expect(tab.className).toContain("focus-visible:ring-ring");
        expect(tab.className).not.toContain("focus-visible:ring-ring/50");
        expect(tab.className).toContain("data-active:bg-primary");
        expect(tab.className).toContain("data-active:text-primary-foreground");
      }
    });
  });

  describe("cancelling", () => {
    const confirmed = () =>
      makeBooking("c1", "confirmed", { startsInMs: 72 * HOUR });
    const CANCEL_NAME = "Cancel booking for Box braids at Pink Studio";

    async function openDialog(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: CANCEL_NAME }));
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

    it("shows the cancelled booking under Past straight away, before the API list comes back", async () => {
      cancelBooking.mockResolvedValue(cancelResponse("c1", true));
      // The refresh never answers: only the update from the cancel can move it.
      listBookings.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderPage([confirmed()]);

      const dialog = await openDialog(user);
      await user.click(
        within(dialog).getByRole("button", { name: "Cancel booking" }),
      );

      expect(
        await screen.findByRole("tab", { name: "Upcoming (0)" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Past (1)" })).toBeInTheDocument();
      await user.click(screen.getByRole("tab", { name: "Past (1)" }));
      expect(within(panel()).getByText("Cancelled")).toBeInTheDocument();
      expect(
        within(panel()).getByText("Your deposit will be refunded."),
      ).toBeInTheDocument();
    });

    it("does not call a booking Expired when the cancel answer has no cancelled_at", async () => {
      cancelBooking.mockResolvedValue({
        id: "c1",
        status: "cancelled",
        refund_due: true,
        cancelled_at: null,
      });
      listBookings.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderPage([confirmed()]);

      const dialog = await openDialog(user);
      await user.click(
        within(dialog).getByRole("button", { name: "Cancel booking" }),
      );

      await user.click(await screen.findByRole("tab", { name: "Past (1)" }));
      expect(within(panel()).getByText("Cancelled")).toBeInTheDocument();
      expect(within(panel()).queryByText("Expired")).toBeNull();
    });

    it("cancels once, tells the client the refund outcome from refund_due, and reads the refund status", async () => {
      cancelBooking.mockResolvedValue(cancelResponse("c1", true));
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
          "Box braids at Pink Studio has been cancelled. Your deposit will be refunded. You can find it under Past.",
        ),
      ).toBeInTheDocument();
      expect(cancelBooking).toHaveBeenCalledTimes(1);
      expect(cancelBooking).toHaveBeenCalledWith("c1");
      expect(screen.queryByRole("alertdialog")).toBeNull();

      await waitFor(() => expect(listBookings).toHaveBeenCalled());
      await user.click(screen.getByRole("tab", { name: "Past (1)" }));
      expect(
        await within(panel()).findByText("Refund pending"),
      ).toBeInTheDocument();
      expect(
        within(panel()).getByText("Your refund is being processed."),
      ).toBeInTheDocument();
    });

    it("says there is no refund when the API says refund_due is false for a paid booking", async () => {
      cancelBooking.mockResolvedValue(cancelResponse("c1", false));
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
          /No refund: it was cancelled within 24 hours of the start time\./,
        ),
      ).toBeInTheDocument();
    });

    it("says nothing was charged when an unpaid booking is cancelled", async () => {
      cancelBooking.mockResolvedValue(cancelResponse("p1", false));
      getBooking.mockResolvedValue({ payment_status: null });
      listBookings.mockResolvedValue([
        makeBooking("p1", "cancelled", {
          refundDue: false,
          cancelledAt: CANCELLED_AT,
        }),
      ]);
      const user = userEvent.setup();
      renderPage([makeBooking("p1", "pending", { createdAgoMs: MINUTE })]);
      await user.click(screen.getByRole("button", { name: CANCEL_NAME }));
      await user.click(screen.getByRole("button", { name: "Cancel booking" }));
      expect(
        await screen.findByText(/Nothing was charged\./),
      ).toBeInTheDocument();
    });

    it("does not repeat itself when the API gave no refund answer", async () => {
      cancelBooking.mockResolvedValue(cancelResponse("c1", null));
      listBookings.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderPage([confirmed()]);
      const dialog = await openDialog(user);
      await user.click(
        within(dialog).getByRole("button", { name: "Cancel booking" }),
      );
      expect(
        await screen.findByText(
          "Box braids at Pink Studio has been cancelled. You can find it under Past.",
        ),
      ).toBeInTheDocument();
    });

    it("refreshes the list only once when a booking with a running hold is cancelled", async () => {
      cancelBooking.mockResolvedValue(cancelResponse("p1", false));
      getBooking.mockResolvedValue({ payment_status: null });
      listBookings.mockResolvedValue([
        makeBooking("p1", "cancelled", {
          refundDue: false,
          cancelledAt: CANCELLED_AT,
        }),
      ]);
      const user = userEvent.setup();
      renderPage([makeBooking("p1", "pending", { createdAgoMs: MINUTE })]);
      await user.click(screen.getByRole("button", { name: CANCEL_NAME }));
      await user.click(screen.getByRole("button", { name: "Cancel booking" }));
      await screen.findByText(/Nothing was charged\./);
      await waitFor(() => expect(listBookings).toHaveBeenCalled());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      expect(listBookings).toHaveBeenCalledTimes(1);
    });

    it("moves focus to the result and lets it be dismissed", async () => {
      cancelBooking.mockResolvedValue(cancelResponse("c1", true));
      listBookings.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderPage([confirmed()]);
      const dialog = await openDialog(user);
      await user.click(
        within(dialog).getByRole("button", { name: "Cancel booking" }),
      );

      const message = await screen.findByText(/has been cancelled/);
      const box = message.parentElement as HTMLElement;
      await waitFor(() => expect(box).toHaveFocus());

      await user.click(screen.getByRole("button", { name: "Dismiss message" }));
      expect(screen.queryByText(/has been cancelled/)).toBeNull();
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
      expect(
        screen.getByText("No refund is due on this booking."),
      ).toBeInTheDocument();
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
    it("keeps the list and offers Retry, saying it may be out of date, when a refresh fails", async () => {
      cancelBooking.mockResolvedValue(cancelResponse("c1", true));
      listBookings.mockRejectedValueOnce(new TypeError("fetch failed"));
      listBookings.mockResolvedValue([]);
      const user = userEvent.setup();
      renderPage([makeBooking("c1", "confirmed", { startsInMs: 72 * HOUR })]);
      await user.click(
        screen.getByRole("button", {
          name: "Cancel booking for Box braids at Pink Studio",
        }),
      );
      await user.click(screen.getByRole("button", { name: "Cancel booking" }));

      const alert = await screen.findByText(
        "We could not refresh your bookings.",
      );
      expect(
        screen.getByText("The list below may be out of date."),
      ).toBeInTheDocument();
      // The cancelled booking is still shown from the API's answer.
      expect(screen.getByRole("tab", { name: "Past (1)" })).toBeInTheDocument();

      await user.click(
        within(alert.parentElement as HTMLElement).getByRole("button", {
          name: "Retry",
        }),
      );
      await waitFor(() => expect(listBookings).toHaveBeenCalledTimes(2));
    });

    it("disables Retry and says 'Retrying...' while it reads the list again", async () => {
      cancelBooking.mockResolvedValue(cancelResponse("c1", true));
      listBookings.mockRejectedValueOnce(new TypeError("fetch failed"));
      listBookings.mockReturnValueOnce(new Promise(() => {}));
      const user = userEvent.setup();
      renderPage([makeBooking("c1", "confirmed", { startsInMs: 72 * HOUR })]);
      await user.click(
        screen.getByRole("button", {
          name: "Cancel booking for Box braids at Pink Studio",
        }),
      );
      await user.click(screen.getByRole("button", { name: "Cancel booking" }));
      await screen.findByText("We could not refresh your bookings.");

      await user.click(screen.getByRole("button", { name: "Retry" }));

      const retrying = await screen.findByRole("button", {
        name: "Retrying...",
      });
      expect(retrying).toBeDisabled();
    });

    it("reads the list again when the page is restored with the Back button", async () => {
      renderPage([makeBooking("c1", "confirmed", { startsInMs: 72 * HOUR })]);
      expect(listBookings).not.toHaveBeenCalled();

      await act(async () => {
        window.dispatchEvent(
          Object.assign(new Event("pageshow"), { persisted: true }),
        );
      });

      await waitFor(() => expect(listBookings).toHaveBeenCalledTimes(1));
    });

    it("does not read the list again for an ordinary pageshow", async () => {
      renderPage([makeBooking("c1", "confirmed", { startsInMs: 72 * HOUR })]);
      await act(async () => {
        window.dispatchEvent(
          Object.assign(new Event("pageshow"), { persisted: false }),
        );
      });
      expect(listBookings).not.toHaveBeenCalled();
    });

    it("reads the list again when the page turns out to be an old one restored from the browser cache", async () => {
      // The page was rendered at NOW (its stamp); the fresh measurement says
      // the server clock is a minute ahead of what the stamp implies.
      vi.spyOn(Date, "now").mockReturnValue(NOW);
      fetchClockSkew.mockResolvedValue(60_000);
      try {
        renderPage([makeBooking("c1", "confirmed", { startsInMs: 72 * HOUR })]);
        await waitFor(() => expect(listBookings).toHaveBeenCalledTimes(1));
      } finally {
        vi.restoreAllMocks();
      }
    });

    it("does not read the list again for a page that was just rendered", async () => {
      vi.spyOn(Date, "now").mockReturnValue(NOW);
      fetchClockSkew.mockResolvedValue(500);
      try {
        renderPage([makeBooking("c1", "confirmed", { startsInMs: 72 * HOUR })]);
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
        });
        expect(listBookings).not.toHaveBeenCalled();
      } finally {
        vi.restoreAllMocks();
      }
    });
  });
});

describe("MyBookings clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.setSystemTime(NOW);
    listBookings.mockResolvedValue([]);
    getBooking.mockResolvedValue({ payment_status: null });
    fetchClockSkew.mockResolvedValue(null);
  });
  afterEach(() => vi.useRealTimers());

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
      await vi.advanceTimersByTimeAsync(1);
      await vi.advanceTimersByTimeAsync(0);
    });
  }

  it("counts the hold down every second, to the exact second", async () => {
    renderPage([
      makeBooking("h1", "pending", {
        createdAgoMs: 2 * MINUTE,
        startsInMs: 5 * HOUR,
      }),
    ]);
    expect(screen.getByText("Time left to pay: 13:00")).toBeInTheDocument();

    // 5 seconds plus the 1 ms the test helper adds to flush: 12:54.999 shows as 12:55.
    await advance(5000);
    expect(screen.getByText("Time left to pay: 12:55")).toBeInTheDocument();

    await advance(1000);
    expect(screen.getByText("Time left to pay: 12:54")).toBeInTheDocument();
  });

  it("moves an unpaid booking to Past as Expired when its 15 minutes end, and asks the API once", async () => {
    listBookings.mockResolvedValue([
      makeBooking("h1", "cancelled", {
        createdAgoMs: 16 * MINUTE,
        cancelledAt: null,
        startsInMs: 5 * HOUR,
      }),
    ]);
    renderPage([
      makeBooking("h1", "pending", {
        createdAgoMs: 14 * MINUTE,
        startsInMs: 5 * HOUR,
      }),
    ]);
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

  it("does not offer Pay on an unpaid booking whose appointment time has already passed", async () => {
    renderPage([
      makeBooking("h1", "pending", {
        createdAgoMs: 2 * MINUTE,
        startsInMs: -MINUTE,
      }),
    ]);
    expect(screen.queryByRole("link", { name: /Pay now/ })).toBeNull();
    expect(
      screen.getByText(
        "This appointment time has passed, so it can no longer be paid.",
      ),
    ).toBeInTheDocument();
  });
});
