import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNotice } from "./useNotice";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useNotice", () => {
  it("shows the message a moment after it is set", () => {
    const { result } = renderHook(() => useNotice());
    act(() => result.current[1]("Service added."));
    expect(result.current[0]).toBe("");
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current[0]).toBe("Service added.");
  });

  it("clears the text first when the same message is shown again, so it is announced again", () => {
    const { result } = renderHook(() => useNotice());
    act(() => result.current[1]("Service added."));
    act(() => {
      vi.advanceTimersByTime(60);
    });
    act(() => result.current[1]("Service added."));
    expect(result.current[0]).toBe("");
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current[0]).toBe("Service added.");
  });

  it("goes away by itself", () => {
    const { result } = renderHook(() => useNotice(1000));
    act(() => result.current[1]("Saved."));
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current[0]).toBe("Saved.");
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(result.current[0]).toBe("");
  });
});
