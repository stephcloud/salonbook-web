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

  it("follows the API refund_due even if the list had the booking as unpaid or unknown", () => {
    for (const wasPaid of [false, null]) {
      expect(
        cancelOutcome({ wasPaid, refundDue: true, cancellationHours: 24 }).kind,
      ).toBe("refund");
    }
  });

  it("says there is no refund, plainly and with the salon's own hours, for a paid booking when refund_due is false", () => {
    expect(
      cancelOutcome({ wasPaid: true, refundDue: false, cancellationHours: 24 }),
    ).toEqual({
      kind: "no-refund",
      message: "No refund: it was cancelled within 24 hours of the start time.",
    });
    expect(
      cancelOutcome({ wasPaid: true, refundDue: false, cancellationHours: 48 })
        .message,
    ).toContain("within 48 hours");
  });

  it("says nothing was charged only when it is known that no deposit was paid", () => {
    expect(
      cancelOutcome({
        wasPaid: false,
        refundDue: false,
        cancellationHours: 24,
      }),
    ).toEqual({ kind: "nothing-charged", message: "Nothing was charged." });
  });

  it("makes no claim about money when it could not be checked whether a deposit was paid", () => {
    expect(
      cancelOutcome({ wasPaid: null, refundDue: false, cancellationHours: 24 }),
    ).toEqual({ kind: "unknown", message: "" });
  });

  it("makes no claim about money when refund_due is null", () => {
    expect(
      cancelOutcome({ wasPaid: true, refundDue: null, cancellationHours: 24 }),
    ).toEqual({ kind: "unknown", message: "" });
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

  it("only says that no refund is due when refund_due is false (the list cannot tell unpaid from paid)", () => {
    expect(cancelledListNote(false)).toBe("No refund is due on this booking.");
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
