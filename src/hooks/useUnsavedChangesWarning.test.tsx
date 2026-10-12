import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  UNSAVED_MESSAGE,
  useUnsavedChangesWarning,
} from "./useUnsavedChangesWarning";

function Probe({ dirty }: { dirty: boolean }) {
  useUnsavedChangesWarning(dirty);
  return (
    <div>
      <a href="/dashboard">Dashboard</a>
      <a href="/elsewhere" target="_blank">
        New tab
      </a>
      <a href="#section">Jump</a>
      <a href="/inner">
        <span>Inner text</span>
      </a>
      <button type="button" data-leaves-page>
        Sign out
      </button>
      <button type="button">Plain button</button>
    </div>
  );
}

/** Clicks and returns the event, to see whether it was cancelled. */
function click(element: Element, init: MouseEventInit = {}) {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  element.dispatchEvent(event);
  return event;
}

function beforeUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

afterEach(() => vi.restoreAllMocks());

describe("useUnsavedChangesWarning: closing or reloading the tab", () => {
  it("asks the browser to confirm while there are unsaved changes", () => {
    render(<Probe dirty />);
    expect(beforeUnload().defaultPrevented).toBe(true);
  });

  it("does not interfere when nothing changed", () => {
    render(<Probe dirty={false} />);
    expect(beforeUnload().defaultPrevented).toBe(false);
  });

  it("starts and stops asking as the changes come and go", () => {
    const view = render(<Probe dirty={false} />);
    view.rerender(<Probe dirty />);
    expect(beforeUnload().defaultPrevented).toBe(true);
    view.rerender(<Probe dirty={false} />);
    expect(beforeUnload().defaultPrevented).toBe(false);
  });

  it("stops asking once the component is gone", () => {
    const view = render(<Probe dirty />);
    view.unmount();
    expect(beforeUnload().defaultPrevented).toBe(false);
  });
});

describe("useUnsavedChangesWarning: clicking a link", () => {
  it("asks with the unsaved message and lets the click through when accepted", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Probe dirty />);
    const event = click(screen.getByRole("link", { name: "Dashboard" }));
    expect(confirm).toHaveBeenCalledWith(UNSAVED_MESSAGE);
    expect(event.defaultPrevented).toBe(false);
  });

  it("cancels the click, and stops other handlers, when declined", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const later = vi.fn();
    render(<Probe dirty />);
    const link = screen.getByRole("link", { name: "Dashboard" });
    link.addEventListener("click", later);
    const event = click(link);
    expect(event.defaultPrevented).toBe(true);
    expect(later).not.toHaveBeenCalled();
  });

  it("also asks when the click lands on an element inside the link", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Probe dirty />);
    const event = click(screen.getByText("Inner text"));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not ask when nothing changed", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Probe dirty={false} />);
    const event = click(screen.getByRole("link", { name: "Dashboard" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it.each([
    ["ctrl", { ctrlKey: true }],
    ["meta", { metaKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
  ])("ignores a %s-click, which opens elsewhere", (_name, init) => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Probe dirty />);
    const event = click(screen.getByRole("link", { name: "Dashboard" }), init);
    expect(confirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores a middle-click", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Probe dirty />);
    click(screen.getByRole("link", { name: "Dashboard" }), { button: 1 });
    expect(confirm).not.toHaveBeenCalled();
  });

  it("ignores a link that opens a new tab", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Probe dirty />);
    const event = click(screen.getByRole("link", { name: "New tab" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores a link that only jumps within the page", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Probe dirty />);
    const event = click(screen.getByRole("link", { name: "Jump" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores a click another handler already cancelled", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Probe dirty />);
    const link = screen.getByRole("link", { name: "Dashboard" });
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    event.preventDefault();
    link.dispatchEvent(event);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("ignores buttons that do not leave the page", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Probe dirty />);
    const event = click(screen.getByRole("button", { name: "Plain button" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("useUnsavedChangesWarning: buttons that leave the page", () => {
  it("asks before a [data-leaves-page] button acts, and blocks it when declined", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const handler = vi.fn();
    render(<Probe dirty />);
    const button = screen.getByRole("button", { name: "Sign out" });
    button.addEventListener("click", handler);
    fireEvent.click(button);
    expect(confirm).toHaveBeenCalledWith(UNSAVED_MESSAGE);
    expect(handler).not.toHaveBeenCalled();
  });

  it("lets the button act when the owner accepts", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const handler = vi.fn();
    render(<Probe dirty />);
    const button = screen.getByRole("button", { name: "Sign out" });
    button.addEventListener("click", handler);
    fireEvent.click(button);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not ask when nothing changed", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const handler = vi.fn();
    render(<Probe dirty={false} />);
    const button = screen.getByRole("button", { name: "Sign out" });
    button.addEventListener("click", handler);
    fireEvent.click(button);
    expect(confirm).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("useUnsavedChangesWarning: cleanup", () => {
  it("removes both listeners when the changes are gone", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const view = render(<Probe dirty />);
    view.rerender(<Probe dirty={false} />);
    click(screen.getByRole("link", { name: "Dashboard" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(beforeUnload().defaultPrevented).toBe(false);
  });

  it("removes both listeners on unmount", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const view = render(<Probe dirty />);
    view.unmount();
    const link = document.createElement("a");
    link.href = "/x";
    document.body.append(link);
    click(link);
    link.remove();
    expect(confirm).not.toHaveBeenCalled();
    expect(beforeUnload().defaultPrevented).toBe(false);
  });

  it("does not stack listeners when it re-renders while dirty", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const view = render(<Probe dirty />);
    view.rerender(<Probe dirty />);
    click(screen.getByRole("link", { name: "Dashboard" }));
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
