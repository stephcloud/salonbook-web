import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useViewChange } from "./useViewChange";

function setup(initial: string, placeholder?: string) {
  return renderHook(({ view }) => useViewChange(view, placeholder), {
    initialProps: { view: initial },
  });
}

describe("useViewChange", () => {
  it("is false on the first paint", () => {
    const { result } = setup("pay");
    expect(result.current).toBe(false);
  });

  it("is true once the view differs from the first one", () => {
    const { result, rerender } = setup("pay");
    rerender({ view: "expired" });
    expect(result.current).toBe(true);
  });

  it("is false again if the view goes back to the first one", () => {
    const { result, rerender } = setup("pay");
    rerender({ view: "expired" });
    rerender({ view: "pay" });
    expect(result.current).toBe(false);
  });

  describe("with a placeholder view", () => {
    it("does not count leaving the placeholder for the first real view as a change", () => {
      const { result, rerender } = setup("loading", "loading");
      expect(result.current).toBe(false);
      rerender({ view: "confirming" });
      expect(result.current).toBe(false);
    });

    it("counts a later change from the first real view", () => {
      const { result, rerender } = setup("loading", "loading");
      rerender({ view: "confirming" });
      rerender({ view: "paid" });
      expect(result.current).toBe(true);
    });

    it("stays quiet while the placeholder is still showing", () => {
      const { result, rerender } = setup("loading", "loading");
      rerender({ view: "loading" });
      expect(result.current).toBe(false);
    });
  });
});
