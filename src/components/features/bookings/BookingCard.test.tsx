import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BookingCard } from "./BookingCard";
import { HOUR, MINUTE, NOW, makeBooking } from "./fixtures";

function renderCard(
  booking: ReturnType<typeof makeBooking>,
  extra: Partial<React.ComponentProps<typeof BookingCard>> = {},
) {
  const onCancel = vi.fn();
  render(
    <ul>
      <BookingCard booking={booking} now={NOW} onCancel={onCancel} {...extra} />
    </ul>,
  );
  return { onCancel };
}

describe("BookingCard details", () => {
  it("shows service, salon, stylist and the time in Lagos time", () => {
    renderCard(makeBooking("b1", "confirmed"));
    expect(
      screen.getByRole("heading", { name: "Box braids" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pink Studio")).toBeInTheDocument();
    expect(screen.getByText("with Amara")).toBeInTheDocument();
    // 48 hours after 12:00 UTC on 11 Oct is 12:00 UTC on 13 Oct = 1:00 PM in Lagos.
    expect(screen.getByText("Tue, 13 Oct 2026, 1:00 PM")).toBeInTheDocument();
  });

  it("shows a fixed price in naira", () => {
    renderCard(makeBooking("b1", "confirmed"));
    expect(screen.getByText("₦15,000")).toBeInTheDocument();
  });

  it("shows 'Price on consultation' for a quote service", () => {
    renderCard(makeBooking("b1", "confirmed", { priceType: "quote" }));
    expect(screen.getByText("Price on consultation")).toBeInTheDocument();
  });

  it("says the deposit is paid once confirmed or completed, and due while the hold is running", () => {
    const { unmount } = render(
      <ul>
        <BookingCard
          booking={makeBooking("b1", "confirmed")}
          now={NOW}
          onCancel={vi.fn()}
        />
      </ul>,
    );
    expect(screen.getByText("Deposit paid ₦5,000")).toBeInTheDocument();
    unmount();

    renderCard(makeBooking("b2", "pending", { createdAgoMs: MINUTE }));
    expect(screen.getByText("Deposit due ₦5,000")).toBeInTheDocument();
    expect(screen.queryByText(/Deposit paid/)).toBeNull();
  });

  it.each([
    ["cancelled", { cancelledAt: "2026-10-11T10:00:00.000Z" }],
    ["cancelled", { cancelledAt: null }],
    ["no_show", { startsInMs: -5 * HOUR }],
  ] as const)(
    "does not show a deposit line for a %s booking, where it would read like an amount owed",
    (status, options) => {
      renderCard(makeBooking("b1", status, options));
      expect(screen.queryByText(/Deposit/)).toBeNull();
    },
  );

  it("does not show a deposit line for an expired hold", () => {
    renderCard(makeBooking("b1", "pending", { createdAgoMs: 20 * MINUTE }));
    expect(screen.queryByText(/Deposit/)).toBeNull();
  });
});

describe("BookingCard status badges", () => {
  it.each([
    ["pending", { createdAgoMs: MINUTE }, "Awaiting payment"],
    ["confirmed", {}, "Confirmed"],
    ["completed", { startsInMs: -5 * HOUR }, "Completed"],
    ["cancelled", { cancelledAt: "2026-10-11T10:00:00.000Z" }, "Cancelled"],
    ["no_show", { startsInMs: -5 * HOUR }, "No show"],
  ] as const)("%s shows the %s badge", (status, options, label) => {
    renderCard(makeBooking("b1", status, options));
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("shows an unpaid hold that ran out as Expired, not Awaiting payment", () => {
    renderCard(makeBooking("b1", "pending", { createdAgoMs: 16 * MINUTE }));
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.queryByText("Awaiting payment")).toBeNull();
  });

  it("shows a hold the API already cancelled by itself (no cancelled_at) as Expired", () => {
    renderCard(makeBooking("b1", "cancelled", { cancelledAt: null }));
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.queryByText("Cancelled")).toBeNull();
  });

  it.each([
    ["refund_pending", "Refund pending"],
    ["refunded", "Refunded"],
  ] as const)(
    "adds a blue %s badge next to Cancelled",
    (paymentStatus, label) => {
      renderCard(
        makeBooking("b1", "cancelled", {
          refundDue: true,
          cancelledAt: "2026-10-11T10:00:00.000Z",
        }),
        { paymentStatus },
      );
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );
});

describe("BookingCard pending bookings", () => {
  it("shows the time left and a Pay link while the hold is running", () => {
    renderCard(makeBooking("b1", "pending", { createdAgoMs: 2 * MINUTE }));
    expect(screen.getByText("Time left to pay: 13:00")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Pay now for Box braids at Pink Studio",
      }),
    ).toHaveAttribute("href", "/bookings/b1/pay");
  });

  it("counts down against the clock it is given", () => {
    renderCard(
      makeBooking("b1", "pending", { createdAgoMs: 14 * MINUTE + 59_000 }),
    );
    expect(screen.getByText("Time left to pay: 0:01")).toBeInTheDocument();
  });

  it("never shows Pay once the 15 minutes are up: Expired, a message and Book again", () => {
    renderCard(makeBooking("b1", "pending", { createdAgoMs: 15 * MINUTE }));
    expect(screen.queryByRole("link", { name: /Pay now/ })).toBeNull();
    expect(screen.queryByText(/Time left to pay/)).toBeNull();
    expect(
      screen.getByText("The hold ended before the deposit was paid."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Book again at Pink Studio" }),
    ).toHaveAttribute("href", "/book/salon-1");
  });
});

describe("BookingCard cancel button", () => {
  it("is offered on a confirmed booking that has not started, and passes the booking on", async () => {
    const booking = makeBooking("b1", "confirmed");
    const { onCancel } = renderCard(booking);
    await userEvent.click(
      screen.getByRole("button", {
        name: "Cancel booking for Box braids at Pink Studio",
      }),
    );
    expect(onCancel).toHaveBeenCalledWith(booking);
  });

  it("is offered on a pending booking whose hold is running", () => {
    renderCard(makeBooking("b1", "pending", { createdAgoMs: MINUTE }));
    expect(
      screen.getByRole("button", { name: /^Cancel / }),
    ).toBeInTheDocument();
  });

  it.each([
    [
      "a confirmed booking that has already started",
      makeBooking("b1", "confirmed", { startsInMs: -30 * MINUTE }),
    ],
    [
      "a cancelled booking",
      makeBooking("b2", "cancelled", {
        cancelledAt: "2026-10-11T10:00:00.000Z",
      }),
    ],
    [
      "a completed booking",
      makeBooking("b3", "completed", { startsInMs: -5 * HOUR }),
    ],
    [
      "an expired hold",
      makeBooking("b4", "pending", { createdAgoMs: 20 * MINUTE }),
    ],
  ])("is not offered on %s", (_name, booking) => {
    renderCard(booking);
    expect(screen.queryByRole("button", { name: /^Cancel / })).toBeNull();
  });
});

describe("BookingCard refund text for a cancelled booking", () => {
  const cancelledAt = "2026-10-11T10:00:00.000Z";

  it("follows refund_due true and the refund progress", () => {
    const booking = makeBooking("b1", "cancelled", {
      refundDue: true,
      cancelledAt,
    });
    const { unmount } = render(
      <ul>
        <BookingCard booking={booking} now={NOW} onCancel={vi.fn()} />
      </ul>,
    );
    expect(
      screen.getByText("Your deposit will be refunded."),
    ).toBeInTheDocument();
    unmount();

    const pending = render(
      <ul>
        <BookingCard
          booking={booking}
          now={NOW}
          paymentStatus="refund_pending"
          onCancel={vi.fn()}
        />
      </ul>,
    );
    expect(
      screen.getByText("Your refund is being processed."),
    ).toBeInTheDocument();
    pending.unmount();

    render(
      <ul>
        <BookingCard
          booking={booking}
          now={NOW}
          paymentStatus="refunded"
          onCancel={vi.fn()}
        />
      </ul>,
    );
    expect(screen.getByText("Your deposit was refunded.")).toBeInTheDocument();
  });

  it("says 'No refund is due on this booking.' for refund_due false", () => {
    renderCard(
      makeBooking("b1", "cancelled", { refundDue: false, cancelledAt }),
    );
    expect(
      screen.getByText("No refund is due on this booking."),
    ).toBeInTheDocument();
  });

  it("says nothing about refunds for an expired hold", () => {
    renderCard(
      makeBooking("b1", "cancelled", { refundDue: null, cancelledAt: null }),
    );
    expect(screen.queryByText(/refund/i)).toBeNull();
  });
});

describe("BookingCard Pay button and the start time", () => {
  it("does not offer Pay once the appointment time has passed, even though the hold is still running, and says why", () => {
    // Created 2 minutes ago for a slot that started 1 minute ago.
    renderCard(
      makeBooking("b1", "pending", {
        createdAgoMs: 2 * MINUTE,
        startsInMs: -MINUTE,
      }),
    );
    expect(screen.queryByRole("link", { name: /Pay now/ })).toBeNull();
    expect(screen.queryByText(/Time left to pay/)).toBeNull();
    expect(
      screen.getByText(
        "This appointment time has passed, so it can no longer be paid.",
      ),
    ).toBeInTheDocument();
  });

  it("still offers Pay for a slot that has not started", () => {
    renderCard(
      makeBooking("b1", "pending", {
        createdAgoMs: MINUTE,
        startsInMs: 10 * MINUTE,
      }),
    );
    expect(screen.getByRole("link", { name: /Pay now/ })).toBeInTheDocument();
  });
});

describe("BookingCard buttons have names that start with their visible text", () => {
  it("Cancel, Pay and Book again each begin with what is shown on the button", () => {
    renderCard(makeBooking("b1", "pending", { createdAgoMs: MINUTE }));
    expect(screen.getByRole("link", { name: /^Pay now/ })).toHaveTextContent(
      "Pay now",
    );
    expect(
      screen.getByRole("button", { name: /^Cancel booking/ }),
    ).toHaveTextContent("Cancel booking");
  });

  it("Book again begins with its visible text", () => {
    renderCard(makeBooking("b1", "pending", { createdAgoMs: 20 * MINUTE }));
    expect(screen.getByRole("link", { name: /^Book again/ })).toHaveTextContent(
      "Book again",
    );
  });
});

describe("BookingCard expired versus paid-and-cancelled", () => {
  it("shows a paid booking cancelled with no cancelled_at as Cancelled with its refund note, not as an expired hold", () => {
    renderCard(
      makeBooking("b1", "cancelled", { cancelledAt: null, refundDue: true }),
    );
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByText("Expired")).toBeNull();
    expect(screen.queryByRole("link", { name: /Book again/ })).toBeNull();
    expect(
      screen.getByText("Your deposit will be refunded."),
    ).toBeInTheDocument();
  });
});
