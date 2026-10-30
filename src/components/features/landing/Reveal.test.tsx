import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProblemSection } from "./ProblemSection";
import { Reveal } from "./Reveal";

type Callback = (entries: { isIntersecting: boolean }[]) => void;

// A fake observer that lets the test decide when the element scrolls in.
function mockObserver() {
  const observer = { callback: undefined as Callback | undefined };
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(function (this: unknown, callback: Callback) {
      observer.callback = callback;
      return { observe, disconnect };
    }),
  );
  return { observer, observe, disconnect };
}

function placeAt(top: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top,
  } as DOMRect);
}

const wrapper = () => screen.getByText("Hello").parentElement;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Reveal", () => {
  it("leaves content visible when there is no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    placeAt(5000);
    render(
      <Reveal>
        <p>Hello</p>
      </Reveal>,
    );
    expect(screen.getByText("Hello")).toBeVisible();
    expect(wrapper()).not.toHaveAttribute("data-reveal");
  });

  it("leaves content visible with reduced motion", () => {
    const { observe } = mockObserver();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
    }));
    placeAt(5000);
    render(
      <Reveal>
        <p>Hello</p>
      </Reveal>,
    );
    expect(wrapper()).not.toHaveAttribute("data-reveal");
    expect(observe).not.toHaveBeenCalled();
  });

  it("leaves content visible when it is already on screen", () => {
    const { observe } = mockObserver();
    placeAt(0);
    render(
      <Reveal>
        <p>Hello</p>
      </Reveal>,
    );
    expect(wrapper()).not.toHaveAttribute("data-reveal");
    expect(observe).not.toHaveBeenCalled();
  });

  it("hides content below the fold and shows it once it scrolls in", () => {
    const { observer, observe, disconnect } = mockObserver();
    placeAt(5000);
    render(
      <Reveal delay={160}>
        <p>Hello</p>
      </Reveal>,
    );
    const el = wrapper();
    expect(el).toHaveAttribute("data-reveal", "hidden");
    expect(el).toHaveStyle({ transitionDelay: "160ms" });
    expect(observe).toHaveBeenCalledWith(el);

    act(() => observer.callback?.([{ isIntersecting: false }]));
    expect(el).toHaveAttribute("data-reveal", "hidden");

    act(() => observer.callback?.([{ isIntersecting: true }]));
    expect(el).toHaveAttribute("data-reveal", "shown");
    expect(disconnect).toHaveBeenCalled();
  });

  it("stops observing when it unmounts", () => {
    const { disconnect } = mockObserver();
    placeAt(5000);
    const { unmount } = render(
      <Reveal>
        <p>Hello</p>
      </Reveal>,
    );
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});

describe("ProblemSection", () => {
  it("shows every problem card without an observer", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<ProblemSection />);
    // jsdom loads no CSS, so check the hidden state itself is never set.
    expect(container.querySelector("[data-reveal]")).toBeNull();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Booking a salon should not be this hard",
      }),
    ).toBeVisible();
    for (const title of [
      "Booking by chat and phone",
      "No-shows",
      "No deposits",
    ]) {
      expect(
        screen.getByRole("heading", { level: 3, name: title }),
      ).toBeVisible();
    }
  });
});
