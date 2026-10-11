import { describe, expect, it } from "vitest";
import type { BookingDetail } from "@/lib/api";
import { bookingOutcome } from "./booking-outcome";

type Input = Pick<BookingDetail, "status" | "payment_status">;

describe("bookingOutcome", () => {
  it.each<[Input, string]>([
    [{ status: "confirmed", payment_status: "paid" }, "paid"],
    [{ status: "confirmed", payment_status: null }, "paid"],
    [{ status: "completed", payment_status: "paid" }, "paid"],
    [{ status: "pending", payment_status: "paid" }, "paid"],
    [{ status: "pending", payment_status: "failed" }, "failed"],
    [{ status: "pending", payment_status: "pending" }, "pending"],
    [{ status: "pending", payment_status: null }, "pending"],
    [{ status: "cancelled", payment_status: null }, "ended"],
    [{ status: "cancelled", payment_status: "pending" }, "ended"],
    [{ status: "cancelled", payment_status: "refund_pending" }, "ended"],
    [{ status: "cancelled", payment_status: "refunded" }, "ended"],
    [{ status: "no_show", payment_status: "paid" }, "ended"],
  ])("maps %j to %s", (input, expected) => {
    expect(bookingOutcome(input)).toBe(expected);
  });
});
