import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchClockSkew = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchClockSkew: () => fetchClockSkew(),
}));

import { useCountdown } from "./useCountdown";

const MINUTE = 60_000;
const CREATED_MS = Date.parse("2026-10-11T09:28:55.000Z");
const CREATED = "2026-10-11T09:28:55.000Z";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchClockSkew.mockReset();
    fetchClockSkew.mockResolvedValue(null);
  });
  afterEach(() => vi.useRealTimers());

  it("starts from the booking's timestamp and the server clock, not from page load", () => {
    // The page opens 5 minutes after the booking was created.
    vi.setSystemTime(CREATED_MS + 5 * MINUTE);
    const { result } = renderHook(() =>
      useCountdown(CREATED, CREATED_MS + 5 * MINUTE),
    );
    expect(result.current).toBe(10 * MINUTE);
  });

  it("ticks down every second and stops at exactly zero", () => {
    vi.setSystemTime(CREATED_MS + 14 * MINUTE + 58_000);
    const { result } = renderHook(() =>
      useCountdown(CREATED, CREATED_MS + 14 * MINUTE + 58_000),
    );
    expect(result.current).toBe(2000);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(1000);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(0);

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(0);
  });

  it("uses the server clock when the device clock is wrong", () => {
    // The device thinks it is 4 minutes earlier than the server does.
    const serverNow = CREATED_MS + 10 * MINUTE;
    vi.setSystemTime(serverNow - 4 * MINUTE);
    const { result } = renderHook(() => useCountdown(CREATED, serverNow));
    expect(result.current).toBe(5 * MINUTE);

    act(() => vi.advanceTimersByTime(MINUTE));
    expect(result.current).toBe(4 * MINUTE);
  });

  it("catches up after a throttled tab (it recomputes from the clock)", () => {
    vi.setSystemTime(CREATED_MS);
    const { result } = renderHook(() => useCountdown(CREATED, CREATED_MS));
    // One long jump, as when a background tab wakes up (then one more tick).
    act(() => {
      vi.setSystemTime(CREATED_MS + 10 * MINUTE);
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(5 * MINUTE - 1000);
  });

  describe("measuring the server clock afresh", () => {
    async function flush() {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    }

    it("keeps true time on a page restored from a cache, where the render stamp is old", async () => {
      // The page was rendered 8 minutes ago (stamp), when 7 minutes were left.
      // The device clock is right, so the hold really has 0 minutes... check 1 minute left.
      const stamp = CREATED_MS + 7 * MINUTE;
      vi.setSystemTime(CREATED_MS + 14 * MINUTE);
      fetchClockSkew.mockResolvedValue(0);
      const { result } = renderHook(() => useCountdown(CREATED, stamp));

      await flush();

      expect(result.current).toBe(MINUTE);
    });

    it("without the measurement a stale stamp would make the hold look longer than it is", () => {
      const stamp = CREATED_MS + 7 * MINUTE;
      vi.setSystemTime(CREATED_MS + 14 * MINUTE);
      // Measurement fails: fall back to the stamp (the known limitation).
      const { result } = renderHook(() => useCountdown(CREATED, stamp));
      expect(result.current).toBe(8 * MINUTE);
    });

    it("calls onStale once for that stale page, so the caller can re-read the booking", async () => {
      const stamp = CREATED_MS + 7 * MINUTE;
      vi.setSystemTime(CREATED_MS + 14 * MINUTE);
      fetchClockSkew.mockResolvedValue(0);
      const onStale = vi.fn();
      renderHook(() => useCountdown(CREATED, stamp, onStale));

      await flush();

      expect(onStale).toHaveBeenCalledTimes(1);
    });

    it("does not call onStale for a fresh page on a device with a wrong clock", async () => {
      // Device 4 minutes behind, page just rendered: measured skew matches the stamp.
      const serverNow = CREATED_MS + 10 * MINUTE;
      vi.setSystemTime(serverNow - 4 * MINUTE);
      fetchClockSkew.mockResolvedValue(4 * MINUTE + 300);
      const onStale = vi.fn();
      const { result } = renderHook(() =>
        useCountdown(CREATED, serverNow, onStale),
      );

      await flush();

      expect(onStale).not.toHaveBeenCalled();
      // About 5 minutes left (the extra 300 ms is the measurement noise).
      expect(Math.round(result.current / 1000)).toBe(5 * 60 - 0);
    });
  });

  it("stops its timer on unmount", () => {
    vi.setSystemTime(CREATED_MS);
    const { unmount } = renderHook(() => useCountdown(CREATED, CREATED_MS));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
