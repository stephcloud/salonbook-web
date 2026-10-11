import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNow } from "./useNow";

const SERVER_NOW = Date.parse("2026-10-11T12:00:00Z");

describe("useNow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts from the server time so the first paint matches the server", () => {
    // The device clock is an hour wrong.
    vi.setSystemTime(SERVER_NOW + 60 * 60_000);
    const { result } = renderHook(() => useNow(SERVER_NOW, true));
    expect(result.current).toBe(SERVER_NOW);
  });

  it("ticks every second when fast, following the server clock rather than the device clock", () => {
    vi.setSystemTime(SERVER_NOW + 60 * 60_000);
    const { result } = renderHook(() => useNow(SERVER_NOW, true));

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(SERVER_NOW + 1000);
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current).toBe(SERVER_NOW + 5000);
  });

  it("ticks only every 30 seconds when not fast", () => {
    vi.setSystemTime(SERVER_NOW);
    const { result } = renderHook(() => useNow(SERVER_NOW, false));

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current).toBe(SERVER_NOW);
    act(() => vi.advanceTimersByTime(20_000));
    expect(result.current).toBe(SERVER_NOW + 30_000);
  });

  it("keeps the same offset when it switches from fast to slow (does not re-measure)", () => {
    vi.setSystemTime(SERVER_NOW + 120_000);
    const { result, rerender } = renderHook(
      ({ fast }) => useNow(SERVER_NOW, fast),
      { initialProps: { fast: true } },
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(SERVER_NOW + 5000);

    rerender({ fast: false });
    act(() => vi.advanceTimersByTime(30_000));
    // 35 seconds after the page was rendered on the server clock.
    expect(result.current).toBe(SERVER_NOW + 35_000);
  });

  it("stops its timers on unmount", () => {
    vi.setSystemTime(SERVER_NOW);
    const { unmount } = renderHook(() => useNow(SERVER_NOW, true));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
