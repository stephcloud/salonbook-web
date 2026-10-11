import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getBooking = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getBooking: (...args: unknown[]) => getBooking(...args),
}));

import { ApiError, type BookingDetail } from "@/lib/api";
import {
  FAILED_GRACE_MS,
  POLL_INTERVAL_MS,
  POLL_LIMIT_MS,
  usePaymentConfirmation,
} from "./usePaymentConfirmation";

const ID = "69994867-62d8-480e-b4a6-6f8de65f75c4";

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
    created_at: "2026-10-11T09:28:55.605873Z",
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
    payment_status: "pending",
    payment_amount: 500000,
    ...overrides,
  };
}

const failed = () => booking({ payment_status: "failed" });
const paid = () => booking({ status: "confirmed", payment_status: "paid" });

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    // TanStack hands results over through a zero-delay timer (1 ms on the fake clock).
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("usePaymentConfirmation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getBooking.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("does not poll and reports no booking when there is no id", async () => {
    const { result } = renderHook(() => usePaymentConfirmation(null), {
      wrapper,
    });
    await advance(POLL_INTERVAL_MS * 3);
    expect(result.current.phase).toBe("no-booking");
    expect(getBooking).not.toHaveBeenCalled();
  });

  describe("a payment that failed", () => {
    it("is not shown as failed straight away (a retry may be about to succeed)", async () => {
      getBooking.mockResolvedValue(failed());
      const { result } = renderHook(() => usePaymentConfirmation(ID), {
        wrapper,
      });
      await advance(0);
      expect(result.current.phase).toBe("confirming");
      await advance(FAILED_GRACE_MS - 4000);
      expect(result.current.phase).toBe("confirming");
    });

    it("ends up paid when the webhook arrives after an earlier 'failed' read", async () => {
      getBooking
        .mockResolvedValueOnce(failed())
        .mockResolvedValueOnce(failed())
        .mockResolvedValue(paid());
      const { result } = renderHook(() => usePaymentConfirmation(ID), {
        wrapper,
      });

      await advance(0);
      expect(result.current.phase).toBe("confirming");
      await advance(POLL_INTERVAL_MS);
      expect(result.current.phase).toBe("confirming");
      await advance(POLL_INTERVAL_MS);
      expect(result.current.phase).toBe("paid");

      const calls = getBooking.mock.calls.length;
      await advance(30_000);
      expect(getBooking).toHaveBeenCalledTimes(calls);
    });

    it("is reported as failed once it has stayed failed for the grace period, and polling stops", async () => {
      getBooking.mockResolvedValue(failed());
      const { result } = renderHook(() => usePaymentConfirmation(ID), {
        wrapper,
      });

      await advance(FAILED_GRACE_MS + POLL_INTERVAL_MS);
      expect(result.current.phase).toBe("failed");

      const calls = getBooking.mock.calls.length;
      await advance(30_000);
      expect(getBooking).toHaveBeenCalledTimes(calls);
    });

    it("starts the grace period again if the booking went back to pending in between", async () => {
      getBooking
        .mockResolvedValueOnce(failed())
        .mockResolvedValueOnce(booking())
        .mockResolvedValue(failed());
      const { result } = renderHook(() => usePaymentConfirmation(ID), {
        wrapper,
      });

      await advance(POLL_INTERVAL_MS * 2);
      await advance(FAILED_GRACE_MS - POLL_INTERVAL_MS * 2);
      expect(result.current.phase).toBe("confirming");
    });
  });

  describe("at the time limit", () => {
    it("says 'still processing', not 'failed', when the first failed read came just before the limit", async () => {
      const start = Date.now();
      getBooking.mockImplementation(async () =>
        Date.now() - start >= POLL_LIMIT_MS - 5000 ? failed() : booking(),
      );
      const { result } = renderHook(() => usePaymentConfirmation(ID), {
        wrapper,
      });

      await advance(POLL_LIMIT_MS + 1000);

      expect(result.current.phase).toBe("slow");
    });

    it("starts the failed-grace clock again after checkAgain", async () => {
      getBooking.mockResolvedValue(failed());
      const { result } = renderHook(() => usePaymentConfirmation(ID), {
        wrapper,
      });

      await advance(FAILED_GRACE_MS - 2000);
      expect(result.current.phase).toBe("confirming");

      act(() => result.current.checkAgain());
      await advance(0);
      // Without the reset the earlier failed reads would settle it right away.
      await advance(FAILED_GRACE_MS - 2000);
      expect(result.current.phase).toBe("confirming");

      await advance(4000);
      expect(result.current.phase).toBe("failed");
    });
  });

  describe("other results", () => {
    it("stops quietly on a 401 while the login redirect happens", async () => {
      getBooking.mockRejectedValue(new ApiError(401, "Please sign in again."));
      const { result } = renderHook(() => usePaymentConfirmation(ID), {
        wrapper,
      });

      await advance(0);
      expect(result.current.phase).toBe("signed-out");
      expect(result.current.trouble).toBe(false);

      await advance(30_000);
      expect(getBooking).toHaveBeenCalledTimes(1);
    });

    it.each([403, 404, 422])("stops on a %i", async (status) => {
      getBooking.mockRejectedValue(new ApiError(status, "nope"));
      const { result } = renderHook(() => usePaymentConfirmation(ID), {
        wrapper,
      });
      await advance(30_000);
      expect(result.current.phase).toBe("not-found");
      expect(getBooking).toHaveBeenCalledTimes(1);
    });

    it("reports slow after the time limit when it is still pending", async () => {
      getBooking.mockResolvedValue(booking());
      const { result } = renderHook(() => usePaymentConfirmation(ID), {
        wrapper,
      });
      await advance(POLL_LIMIT_MS + 10);
      expect(result.current.phase).toBe("slow");
    });

    it("treats a cancelled booking as ended", async () => {
      getBooking.mockResolvedValue(booking({ status: "cancelled" }));
      const { result } = renderHook(() => usePaymentConfirmation(ID), {
        wrapper,
      });
      await advance(0);
      expect(result.current.phase).toBe("ended");
    });
  });
});
