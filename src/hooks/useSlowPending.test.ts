import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSlowPending } from "./useSlowPending";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSlowPending", () => {
  it("is false when not pending", async () => {
    const { result } = renderHook(() => useSlowPending(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current).toBe(false);
  });

  it("becomes true only after the default 4 seconds of pending", async () => {
    const { result } = renderHook(() => useSlowPending(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3900);
    });
    expect(result.current).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current).toBe(true);
  });

  it("respects a custom delay", async () => {
    const { result } = renderHook(() => useSlowPending(true, 1000));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(result.current).toBe(true);
  });

  it("resets when pending ends and does not fire for short waits", async () => {
    const { result, rerender } = renderHook(
      ({ pending }) => useSlowPending(pending),
      { initialProps: { pending: true } },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current).toBe(true);

    rerender({ pending: false });
    expect(result.current).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    rerender({ pending: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current).toBe(false);
  });
});
