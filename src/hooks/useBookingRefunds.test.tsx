import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getBooking = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getBooking: (...args: unknown[]) => getBooking(...args),
}));

import { makeBooking } from "@/components/features/bookings/fixtures";
import { MAX_REFUND_LOOKUPS, useBookingRefunds } from "./useBookingRefunds";

const CANCELLED_AT = "2026-10-11T12:00:00.000Z";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("useBookingRefunds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getBooking.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("reads only cancelled bookings whose deposit is due back", async () => {
    getBooking.mockResolvedValue({ payment_status: "refunded" });
    const bookings = [
      makeBooking("r1", "cancelled", {
        refundDue: true,
        cancelledAt: CANCELLED_AT,
      }),
      makeBooking("n1", "cancelled", {
        refundDue: false,
        cancelledAt: CANCELLED_AT,
      }),
      makeBooking("e1", "cancelled", { refundDue: null, cancelledAt: null }),
      makeBooking("c1", "confirmed"),
    ];
    const { result } = renderHook(() => useBookingRefunds(bookings), {
      wrapper,
    });

    await flush();

    expect(getBooking).toHaveBeenCalledTimes(1);
    expect(getBooking).toHaveBeenCalledWith("r1");
    expect(result.current).toEqual({ r1: "refunded" });
  });

  it("looks up at most the first 10, so a long history does not fire a read for every booking", async () => {
    getBooking.mockResolvedValue({ payment_status: "refunded" });
    const bookings = Array.from({ length: 40 }, (_, i) =>
      makeBooking(`r${i}`, "cancelled", {
        refundDue: true,
        cancelledAt: CANCELLED_AT,
      }),
    );
    const { result } = renderHook(() => useBookingRefunds(bookings), {
      wrapper,
    });

    await flush();

    expect(MAX_REFUND_LOOKUPS).toBe(10);
    expect(getBooking).toHaveBeenCalledTimes(10);
    expect(Object.keys(result.current)).toHaveLength(10);
    expect(result.current.r0).toBe("refunded");
    expect(result.current.r10).toBeUndefined();
  });

  it("checks again every 30 seconds while the refund is still pending, and moves on to Refunded", async () => {
    getBooking
      .mockResolvedValueOnce({ payment_status: "refund_pending" })
      .mockResolvedValue({ payment_status: "refunded" });
    const bookings = [
      makeBooking("r1", "cancelled", {
        refundDue: true,
        cancelledAt: CANCELLED_AT,
      }),
    ];
    const { result } = renderHook(() => useBookingRefunds(bookings), {
      wrapper,
    });

    await flush();
    expect(result.current.r1).toBe("refund_pending");

    await flush(29_000);
    expect(getBooking).toHaveBeenCalledTimes(1);
    await flush(2000);
    expect(getBooking).toHaveBeenCalledTimes(2);
    expect(result.current.r1).toBe("refunded");
  });

  it("stops checking once the refund is done", async () => {
    getBooking.mockResolvedValue({ payment_status: "refunded" });
    const bookings = [
      makeBooking("r1", "cancelled", {
        refundDue: true,
        cancelledAt: CANCELLED_AT,
      }),
    ];
    renderHook(() => useBookingRefunds(bookings), { wrapper });

    await flush();
    await flush(120_000);

    expect(getBooking).toHaveBeenCalledTimes(1);
  });

  it("leaves the status unknown when a read fails", async () => {
    getBooking.mockRejectedValue(new TypeError("fetch failed"));
    const bookings = [
      makeBooking("r1", "cancelled", {
        refundDue: true,
        cancelledAt: CANCELLED_AT,
      }),
    ];
    const { result } = renderHook(() => useBookingRefunds(bookings), {
      wrapper,
    });

    await flush();

    expect(result.current.r1).toBeUndefined();
  });
});
