import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Loading from "./loading";

describe("root loading state", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts with a neutral Loading… and no waking-up claim", () => {
    render(<Loading />);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.queryByText(/waking up the server/i)).toBeNull();
  });

  it("explains the wait only after a few seconds", () => {
    render(<Loading />);
    act(() => {
      vi.advanceTimersByTime(3900);
    });
    expect(screen.queryByText(/waking up the server/i)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Waking up the server...",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });
});
