import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cancelBooking = vi.fn();
const getBooking = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  cancelBooking: (...args: unknown[]) => cancelBooking(...args),
  getBooking: (...args: unknown[]) => getBooking(...args),
}));

import { ApiError, type BookingListItem } from "@/lib/api";
import { CancelDialog, type CancelResult } from "./CancelDialog";

const ID = "69994867-62d8-480e-b4a6-6f8de65f75c4";

function item(overrides: Partial<BookingListItem> = {}): BookingListItem {
  return {
    id: ID,
    client_id: "c1",
    stylist_id: "s1",
    service_id: "v1",
    starts_at: "2026-10-15T08:00:00Z",
    ends_at: "2026-10-15T09:00:00Z",
    status: "confirmed",
    refund_due: null,
    cancelled_at: null,
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

function cancelled(refundDue: boolean | null) {
  return {
    id: ID,
    client_id: "c1",
    stylist_id: "s1",
    service_id: "v1",
    starts_at: "2026-10-15T08:00:00Z",
    ends_at: "2026-10-15T09:00:00Z",
    status: "cancelled",
    refund_due: refundDue,
    cancelled_at: "2026-10-11T10:00:00.000Z",
    created_at: "2026-10-11T09:00:00.000Z",
  };
}

const onClose = vi.fn();
const onCancelled = vi.fn();
const onStale = vi.fn();

function Harness({ booking }: { booking: BookingListItem }) {
  const [target, setTarget] = useState<BookingListItem | null>(booking);
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <CancelDialog
        booking={target}
        onClose={() => {
          onClose();
          setTarget(null);
        }}
        onCancelled={(result: CancelResult) => {
          onCancelled(result);
          setTarget(null);
        }}
        onStale={onStale}
      />
    </QueryClientProvider>
  );
}

const CONFIRM_NAME =
  /^(Cancel booking|Cancelling\.\.\.|Redirecting you to sign in\.\.\.)$/;
const confirmButton = () => screen.getByRole("button", { name: CONFIRM_NAME });

describe("CancelDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBooking.mockResolvedValue({ payment_status: null });
  });

  describe("what it says", () => {
    it("explains the refund rule with the salon's own window for a paid booking", () => {
      render(<Harness booking={item()} />);
      expect(
        screen.getByRole("alertdialog", { name: "Cancel this booking?" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Refund only if you cancel more than 24 hours before your appointment/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Box braids with Amara at Pink Studio/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Thu, 15 Oct 2026, 9:00 AM/)).toBeInTheDocument();
    });

    it("uses each salon's own number of hours", () => {
      const base = item();
      render(
        <Harness
          booking={item({ salon: { ...base.salon, cancellation_hours: 48 } })}
        />,
      );
      expect(screen.getByText(/more than 48 hours before/)).toBeInTheDocument();
    });

    it("says nothing is charged when the deposit was never paid", () => {
      render(<Harness booking={item({ status: "pending" })} />);
      expect(
        screen.getByText(
          "You have not paid a deposit, so nothing will be charged.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Refund only if/)).toBeNull();
    });

    it("stays closed with no booking", () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <CancelDialog
            booking={null}
            onClose={onClose}
            onCancelled={onCancelled}
            onStale={onStale}
          />
        </QueryClientProvider>,
      );
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("keeps the error region in the dialog from the start, empty, so a later error is announced", () => {
      render(<Harness booking={item()} />);
      const region = screen.getByRole("alert");
      expect(region).toBeInTheDocument();
      expect(region).toHaveTextContent("");
    });

    it("sizes itself to fit a 320px phone", () => {
      render(<Harness booking={item()} />);
      const popup = screen.getByRole("alertdialog");
      expect(popup.className).toContain("max-w-[calc(100%-2rem)]");
      expect(popup.className).toContain("max-h-[calc(100dvh-2rem)]");
      expect(popup.className).toContain("overflow-y-auto");
    });
  });

  describe("cancelling", () => {
    it("cancels the booking and reports the API's answer with the outcome from refund_due", async () => {
      cancelBooking.mockResolvedValue(cancelled(true));
      const user = userEvent.setup();
      render(<Harness booking={item()} />);

      await user.click(confirmButton());

      await waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1));
      expect(cancelBooking).toHaveBeenCalledWith(ID);
      const result = onCancelled.mock.calls[0][0] as CancelResult;
      expect(result.outcome).toEqual({
        kind: "refund",
        message: "Your deposit will be refunded.",
      });
      expect(result.cancelled.refund_due).toBe(true);
      expect(result.previous.id).toBe(ID);
    });

    it("says there is no refund, plainly, for a confirmed booking when refund_due is false", async () => {
      cancelBooking.mockResolvedValue(cancelled(false));
      const user = userEvent.setup();
      render(<Harness booking={item({ status: "confirmed" })} />);
      await user.click(confirmButton());
      await waitFor(() => expect(onCancelled).toHaveBeenCalled());
      expect((onCancelled.mock.calls[0][0] as CancelResult).outcome).toEqual({
        kind: "no-refund",
        message:
          "No refund: it was cancelled within 24 hours of the start time.",
      });
      // The list already says it was paid: nothing more to look up.
      expect(getBooking).not.toHaveBeenCalled();
    });

    it("makes no claim about money when refund_due is null", async () => {
      cancelBooking.mockResolvedValue(cancelled(null));
      const user = userEvent.setup();
      render(<Harness booking={item({ status: "confirmed" })} />);
      await user.click(confirmButton());
      await waitFor(() => expect(onCancelled).toHaveBeenCalled());
      expect((onCancelled.mock.calls[0][0] as CancelResult).outcome).toEqual({
        kind: "unknown",
        message: "",
      });
    });

    describe("a booking the list showed as unpaid (pending)", () => {
      it("looks the booking up before saying nothing was charged, and says so when it was never paid", async () => {
        cancelBooking.mockResolvedValue(cancelled(false));
        getBooking.mockResolvedValue({ payment_status: "pending" });
        const user = userEvent.setup();
        render(<Harness booking={item({ status: "pending" })} />);

        await user.click(confirmButton());

        await waitFor(() => expect(onCancelled).toHaveBeenCalled());
        expect(getBooking).toHaveBeenCalledWith(ID);
        expect((onCancelled.mock.calls[0][0] as CancelResult).outcome).toEqual({
          kind: "nothing-charged",
          message: "Nothing was charged.",
        });
      });

      it("does not promise 'nothing was charged' if the payment went through after the list loaded", async () => {
        cancelBooking.mockResolvedValue(cancelled(false));
        getBooking.mockResolvedValue({ payment_status: "paid" });
        const user = userEvent.setup();
        render(<Harness booking={item({ status: "pending" })} />);

        await user.click(confirmButton());

        await waitFor(() => expect(onCancelled).toHaveBeenCalled());
        expect(
          (onCancelled.mock.calls[0][0] as CancelResult).outcome.kind,
        ).toBe("no-refund");
      });

      it("makes no claim about money when the lookup fails", async () => {
        cancelBooking.mockResolvedValue(cancelled(false));
        getBooking.mockRejectedValue(new TypeError("fetch failed"));
        const user = userEvent.setup();
        render(<Harness booking={item({ status: "pending" })} />);

        await user.click(confirmButton());

        await waitFor(() => expect(onCancelled).toHaveBeenCalled());
        expect((onCancelled.mock.calls[0][0] as CancelResult).outcome).toEqual({
          kind: "unknown",
          message: "",
        });
      });

      it("does not look anything up when the API already says a refund is due", async () => {
        cancelBooking.mockResolvedValue(cancelled(true));
        const user = userEvent.setup();
        render(<Harness booking={item({ status: "pending" })} />);
        await user.click(confirmButton());
        await waitFor(() => expect(onCancelled).toHaveBeenCalled());
        expect(getBooking).not.toHaveBeenCalled();
        expect(
          (onCancelled.mock.calls[0][0] as CancelResult).outcome.kind,
        ).toBe("refund");
      });
    });

    it("sends one request when the button is clicked twice before React re-renders", async () => {
      cancelBooking.mockReturnValue(new Promise(() => {}));
      render(<Harness booking={item()} />);

      const button = confirmButton();
      act(() => {
        fireEvent.click(button);
        fireEvent.click(button);
      });

      await waitFor(() => expect(cancelBooking).toHaveBeenCalledTimes(1));
      // Give a second call every chance to show up.
      for (let i = 0; i < 10; i += 1) {
        await act(async () => {
          await Promise.resolve();
        });
      }
      expect(cancelBooking).toHaveBeenCalledTimes(1);
      expect(confirmButton()).toBeDisabled();
      expect(confirmButton()).toHaveTextContent("Cancelling...");
    });

    it("keeps both buttons disabled and the dialog open on Escape while the request is on its way", async () => {
      cancelBooking.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      render(<Harness booking={item()} />);
      await user.click(confirmButton());

      expect(
        screen.getByRole("button", { name: "Keep booking" }),
      ).toBeDisabled();
      await user.keyboard("{Escape}");
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("keeps the dialog open on a click outside it while the request is on its way", async () => {
      cancelBooking.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      render(<Harness booking={item()} />);
      await user.click(confirmButton());

      const overlay = document.querySelector(
        '[data-slot="alert-dialog-overlay"]',
      );
      expect(overlay).not.toBeNull();
      await user.click(overlay as Element);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("closes without cancelling when 'Keep booking' is pressed", async () => {
      const user = userEvent.setup();
      render(<Harness booking={item()} />);
      await user.click(screen.getByRole("button", { name: "Keep booking" }));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(cancelBooking).not.toHaveBeenCalled();
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("closes on Escape when nothing is being sent", async () => {
      const user = userEvent.setup();
      render(<Harness booking={item()} />);
      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(cancelBooking).not.toHaveBeenCalled();
    });
  });

  describe("when cancelling fails", () => {
    it.each([403, 404])(
      "says the booking is not in the account on a %i, refreshes the list and offers only Close",
      async (status) => {
        cancelBooking.mockRejectedValue(new ApiError(status, "nope"));
        const user = userEvent.setup();
        render(<Harness booking={item()} />);

        await user.click(confirmButton());

        expect(await screen.findByRole("alert")).toHaveTextContent(
          "We could not find this booking in your account.",
        );
        expect(onStale).toHaveBeenCalledTimes(1);
        expect(onCancelled).not.toHaveBeenCalled();
        // Another try would fail the same way, so there is nothing to retry.
        expect(
          screen.queryByRole("button", { name: "Cancel booking" }),
        ).toBeNull();
        expect(
          screen.queryByRole("button", { name: "Keep booking" }),
        ).toBeNull();
        await user.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("alertdialog")).toBeNull();
      },
    );

    it("shows the API's own reason when it refuses (for example too late), refreshes the list and offers only Close", async () => {
      cancelBooking.mockRejectedValue(
        new ApiError(409, "This booking can no longer be cancelled."),
      );
      const user = userEvent.setup();
      render(<Harness booking={item()} />);

      await user.click(confirmButton());

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "This booking can no longer be cancelled.",
      );
      expect(onStale).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("hides raw server text on a 5xx, lets the client try again and can be dismissed again", async () => {
      cancelBooking
        .mockRejectedValueOnce(
          new ApiError(500, "Traceback (most recent call last)"),
        )
        .mockResolvedValueOnce(cancelled(true));
      const user = userEvent.setup();
      render(<Harness booking={item()} />);

      await user.click(confirmButton());
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "We could not cancel your booking. Please try again.",
      );
      expect(screen.queryByText(/Traceback/)).toBeNull();
      expect(onStale).not.toHaveBeenCalled();
      // After an error the dialog may be dismissed again.
      expect(
        screen.getByRole("button", { name: "Keep booking" }),
      ).toBeEnabled();

      await user.click(confirmButton());
      await waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1));
      expect(cancelBooking).toHaveBeenCalledTimes(2);
    });

    it("can be dismissed with Escape after a network error", async () => {
      cancelBooking.mockRejectedValueOnce(new TypeError("fetch failed"));
      const user = userEvent.setup();
      render(<Harness booking={item()} />);
      await user.click(confirmButton());
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not reach the server",
      );

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("stays quiet and disabled on a 401 while the login redirect happens", async () => {
      cancelBooking.mockRejectedValue(
        new ApiError(401, "Please sign in again."),
      );
      const user = userEvent.setup();
      render(<Harness booking={item()} />);

      await user.click(confirmButton());

      await waitFor(() =>
        expect(confirmButton()).toHaveTextContent(
          "Redirecting you to sign in...",
        ),
      );
      expect(screen.getByRole("alert")).toHaveTextContent("");
      expect(confirmButton()).toBeDisabled();
      expect(onStale).not.toHaveBeenCalled();
    });
  });

  describe("when the sign-in redirect never happens", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("lets go after 10 seconds so the dialog is not stuck", async () => {
      cancelBooking.mockRejectedValue(
        new ApiError(401, "Please sign in again."),
      );
      render(<Harness booking={item()} />);

      fireEvent.click(confirmButton());
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(confirmButton()).toBeDisabled();
      expect(confirmButton()).toHaveTextContent(
        "Redirecting you to sign in...",
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(confirmButton()).toBeEnabled();
      expect(confirmButton()).toHaveTextContent("Cancel booking");
      expect(
        screen.getByRole("button", { name: "Keep booking" }),
      ).toBeEnabled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "The sign-in page did not open. Please try again.",
      );
    });
  });
});

describe("CancelDialog when the payment lookup is slow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it("gives up on the lookup after 5 seconds so a sleeping server cannot lock the dialog, and makes no claim about money", async () => {
    cancelBooking.mockResolvedValue(cancelled(false));
    getBooking.mockReturnValue(new Promise(() => {}));
    render(<Harness booking={item({ status: "pending" })} />);

    fireEvent.click(confirmButton());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4900);
    });
    // Still waiting: nothing reported yet and the dialog cannot be dismissed.
    expect(onCancelled).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect((onCancelled.mock.calls[0][0] as CancelResult).outcome).toEqual({
      kind: "unknown",
      message: "",
    });
  });

  it("does not wait at all when the lookup answers quickly", async () => {
    cancelBooking.mockResolvedValue(cancelled(false));
    getBooking.mockResolvedValue({ payment_status: "pending" });
    render(<Harness booking={item({ status: "pending" })} />);

    fireEvent.click(confirmButton());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect((onCancelled.mock.calls[0][0] as CancelResult).outcome.kind).toBe(
      "nothing-charged",
    );
  });
});
