import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

const MINUTE = 60_000;
const CREATED_MS = Date.parse("2026-10-11T09:28:55.000Z");
const CREATED = "2026-10-11T09:28:55.000Z";

describe("useCountdown", () => {
  beforeEach(() => vi.useFakeTimers());
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

  it("stops its timer on unmount", () => {
    vi.setSystemTime(CREATED_MS);
    const { unmount } = renderHook(() => useCountdown(CREATED, CREATED_MS));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
