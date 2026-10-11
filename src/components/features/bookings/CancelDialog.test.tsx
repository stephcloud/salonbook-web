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
import { beforeEach, describe, expect, it, vi } from "vitest";

const cancelBooking = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  cancelBooking: (...args: unknown[]) => cancelBooking(...args),
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
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
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

const confirmButton = () =>
  screen.getByRole("button", {
    name: /^(Cancel booking|Cancelling\.\.\.|Redirecting you to sign in\.\.\.)$/,
  });

describe("CancelDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it.each([
      [
        false,
        "confirmed",
        "no-refund",
        "No refund, cancelled inside the 24-hour window.",
      ],
      [false, "pending", "nothing-charged", "Nothing was charged."],
      [null, "confirmed", "unknown", "Your booking is cancelled."],
    ] as const)(
      "turns refund_due %s on a %s booking into the right outcome",
      async (refundDue, status, kind, message) => {
        cancelBooking.mockResolvedValue(cancelled(refundDue));
        const user = userEvent.setup();
        render(<Harness booking={item({ status })} />);
        await user.click(confirmButton());
        await waitFor(() => expect(onCancelled).toHaveBeenCalled());
        expect((onCancelled.mock.calls[0][0] as CancelResult).outcome).toEqual({
          kind,
          message,
        });
      },
    );

    it("sends one request when the button is clicked twice before React re-renders", async () => {
      cancelBooking.mockReturnValue(new Promise(() => {}));
      render(<Harness booking={item()} />);

      const button = confirmButton();
      act(() => {
        fireEvent.click(button);
        fireEvent.click(button);
      });

      await waitFor(() => expect(cancelBooking).toHaveBeenCalledTimes(1));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(cancelBooking).toHaveBeenCalledTimes(1);
      expect(confirmButton()).toBeDisabled();
      expect(confirmButton()).toHaveTextContent("Cancelling...");
    });

    it("keeps both buttons disabled and the dialog open while the request is on its way", async () => {
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
      "says the booking is not in the account on a %i, refreshes the list and allows another try",
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
        expect(confirmButton()).toBeEnabled();
      },
    );

    it("shows the API's own reason when it refuses (for example too late) and refreshes the list", async () => {
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
    });

    it("hides raw server text on a 5xx and lets the client try again", async () => {
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

      await user.click(confirmButton());
      await waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1));
      expect(cancelBooking).toHaveBeenCalledTimes(2);
    });

    it("explains a network failure", async () => {
      cancelBooking.mockRejectedValueOnce(new TypeError("fetch failed"));
      const user = userEvent.setup();
      render(<Harness booking={item()} />);
      await user.click(confirmButton());
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not reach the server",
      );
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
      expect(screen.queryByRole("alert")).toBeNull();
      expect(confirmButton()).toBeDisabled();
      expect(onStale).not.toHaveBeenCalled();
    });
  });
});
