import { describe, expect, it } from "vitest";
import {
  cancelOutcome,
  cancelledListNote,
  refundBadge,
} from "./cancel-outcome";

describe("cancelOutcome (straight after cancelling)", () => {
  it("says the deposit will be refunded when refund_due is true", () => {
    expect(
      cancelOutcome({ wasPaid: true, refundDue: true, cancellationHours: 24 }),
    ).toEqual({ kind: "refund", message: "Your deposit will be refunded." });
  });

  it("says there is no refund, naming the window, for a paid booking when refund_due is false", () => {
    expect(
      cancelOutcome({ wasPaid: true, refundDue: false, cancellationHours: 24 }),
    ).toEqual({
      kind: "no-refund",
      message: "No refund, cancelled inside the 24-hour window.",
    });
    expect(
      cancelOutcome({ wasPaid: true, refundDue: false, cancellationHours: 48 })
        .message,
    ).toContain("48-hour");
  });

  it("says nothing was charged when an unpaid booking is cancelled", () => {
    expect(
      cancelOutcome({
        wasPaid: false,
        refundDue: false,
        cancellationHours: 24,
      }),
    ).toEqual({ kind: "nothing-charged", message: "Nothing was charged." });
  });

  it("makes no refund claim when refund_due is null", () => {
    expect(
      cancelOutcome({ wasPaid: true, refundDue: null, cancellationHours: 24 }),
    ).toEqual({ kind: "unknown", message: "Your booking is cancelled." });
  });

  it("follows the API refund_due, not the other inputs, when it says true", () => {
    expect(
      cancelOutcome({ wasPaid: false, refundDue: true, cancellationHours: 0 })
        .kind,
    ).toBe("refund");
  });
});

describe("cancelledListNote (an already cancelled booking in the list)", () => {
  it("follows refund_due and the progress of the refund", () => {
    expect(cancelledListNote(true)).toBe("Your deposit will be refunded.");
    expect(cancelledListNote(true, "paid")).toBe(
      "Your deposit will be refunded.",
    );
    expect(cancelledListNote(true, "refund_pending")).toBe(
      "Your refund is being processed.",
    );
    expect(cancelledListNote(true, "refunded")).toBe(
      "Your deposit was refunded.",
    );
  });

  it("only says 'no refund due' when refund_due is false (it cannot tell unpaid from paid)", () => {
    expect(cancelledListNote(false)).toBe("No refund due.");
  });

  it("says nothing for an expired hold (refund_due null)", () => {
    expect(cancelledListNote(null)).toBeNull();
  });
});

describe("refundBadge", () => {
  it.each([
    ["refund_pending", "Refund pending"],
    ["refunded", "Refunded"],
  ] as const)("maps %s to %s", (status, label) => {
    expect(refundBadge(status)).toBe(label);
  });

  it.each([["paid"], ["pending"], ["failed"], [null], [undefined]] as const)(
    "shows no refund badge for %s",
    (status) => {
      expect(refundBadge(status)).toBeNull();
    },
  );
});
