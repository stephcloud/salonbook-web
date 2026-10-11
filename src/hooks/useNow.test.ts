import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchClockSkew = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchClockSkew: () => fetchClockSkew(),
}));

import { STALE_PAYLOAD_MS } from "@/lib/clock-skew";
import { useNow } from "./useNow";

const SERVER_NOW = Date.parse("2026-10-11T12:00:00Z");
const FAR_FUTURE = SERVER_NOW + 24 * 60 * 60_000;

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("useNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchClockSkew.mockReset();
    fetchClockSkew.mockResolvedValue(null);
  });
  afterEach(() => vi.useRealTimers());

  it("starts from the server render stamp so the first paint matches the server", () => {
    // The device clock is an hour wrong.
    vi.setSystemTime(SERVER_NOW + 60 * 60_000);
    const { result } = renderHook(() => useNow(SERVER_NOW, FAR_FUTURE));
    expect(result.current).toBe(SERVER_NOW);
  });

  it("ticks every second while a hold is running, following the server clock rather than the device clock", () => {
    vi.setSystemTime(SERVER_NOW + 60 * 60_000);
    const { result } = renderHook(() => useNow(SERVER_NOW, FAR_FUTURE));

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(SERVER_NOW + 1000);
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current).toBe(SERVER_NOW + 5000);
  });

  describe("how often it ticks", () => {
    it("ticks only every 30 seconds when there is no hold (fastUntil is null)", () => {
      vi.setSystemTime(SERVER_NOW);
      const { result } = renderHook(() => useNow(SERVER_NOW, null));

      act(() => vi.advanceTimersByTime(10_000));
      expect(result.current).toBe(SERVER_NOW);
      act(() => vi.advanceTimersByTime(20_000));
      expect(result.current).toBe(SERVER_NOW + 30_000);
    });

    it("drops to every 30 seconds once the latest hold has ended, so a stale pending booking cannot keep it ticking", () => {
      vi.setSystemTime(SERVER_NOW);
      const holdEnds = SERVER_NOW + 3000;
      const { result } = renderHook(() => useNow(SERVER_NOW, holdEnds));

      // Every second until the hold ends...
      act(() => vi.advanceTimersByTime(3000));
      expect(result.current).toBe(SERVER_NOW + 3000);
      // ...then only every 30 seconds.
      act(() => vi.advanceTimersByTime(10_000));
      expect(result.current).toBe(SERVER_NOW + 3000);
      act(() => vi.advanceTimersByTime(20_000));
      expect(result.current).toBe(SERVER_NOW + 30_000 + 3000);
    });

    it("keeps the same offset when the tick speed changes (does not re-measure)", () => {
      vi.setSystemTime(SERVER_NOW + 120_000);
      const holdEnds = SERVER_NOW + 5000;
      const { result } = renderHook(() => useNow(SERVER_NOW, holdEnds));

      act(() => vi.advanceTimersByTime(5000));
      expect(result.current).toBe(SERVER_NOW + 5000);
      act(() => vi.advanceTimersByTime(30_000));
      expect(result.current).toBe(SERVER_NOW + 35_000);
    });
  });

  describe("measuring the server clock afresh", () => {
    it("switches to the measured offset once it arrives", async () => {
      // The page was rendered at SERVER_NOW; the device is 4 minutes behind it.
      vi.setSystemTime(SERVER_NOW - 4 * 60_000);
      // Measured: the server is 4 minutes ahead of the device (same as the stamp).
      fetchClockSkew.mockResolvedValue(4 * 60_000);
      const { result } = renderHook(() => useNow(SERVER_NOW, FAR_FUTURE));

      await flush();

      expect(result.current).toBe(SERVER_NOW - 4 * 60_000 + 4 * 60_000);
    });

    it("ignores a stale render stamp: a page restored from a cache keeps true time", async () => {
      // The stamp is 10 minutes old by the time the page is shown: the device
      // clock (correct) is at SERVER_NOW + 10 minutes. The true skew is 0.
      vi.setSystemTime(SERVER_NOW + 10 * 60_000);
      fetchClockSkew.mockResolvedValue(0);
      const { result } = renderHook(() => useNow(SERVER_NOW, FAR_FUTURE));

      await flush();

      expect(result.current).toBe(SERVER_NOW + 10 * 60_000);
    });

    it("calls onStale once when the stamp is more than 15 seconds older than the measurement", async () => {
      vi.setSystemTime(SERVER_NOW + 10 * 60_000);
      fetchClockSkew.mockResolvedValue(0);
      const onStale = vi.fn();
      renderHook(() => useNow(SERVER_NOW, FAR_FUTURE, onStale));

      await flush();

      expect(onStale).toHaveBeenCalledTimes(1);
    });

    it("does not call onStale for a fresh page, or for a device with a wrong clock", async () => {
      // Device 10 minutes ahead, page just rendered: measured skew matches the stamp's.
      vi.setSystemTime(SERVER_NOW + 10 * 60_000);
      fetchClockSkew.mockResolvedValue(-10 * 60_000 + STALE_PAYLOAD_MS - 1000);
      const onStale = vi.fn();
      renderHook(() => useNow(SERVER_NOW, FAR_FUTURE, onStale));

      await flush();

      expect(onStale).not.toHaveBeenCalled();
    });

    it("uses the render stamp when the measurement fails", async () => {
      vi.setSystemTime(SERVER_NOW + 120_000);
      fetchClockSkew.mockResolvedValue(null);
      const { result } = renderHook(() => useNow(SERVER_NOW, FAR_FUTURE));

      await flush();
      act(() => vi.advanceTimersByTime(1000));

      expect(result.current).toBe(SERVER_NOW + 1000);
    });
  });

  it("stops its timers on unmount", () => {
    vi.setSystemTime(SERVER_NOW);
    const { unmount } = renderHook(() => useNow(SERVER_NOW, FAR_FUTURE));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
