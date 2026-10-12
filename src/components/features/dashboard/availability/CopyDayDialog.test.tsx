import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyDayDialog } from "./CopyDayDialog";

function setup(source: number | null = 0) {
  const onClose = vi.fn();
  const onCopy = vi.fn();
  const view = render(
    <CopyDayDialog source={source} onClose={onClose} onCopy={onCopy} />,
  );
  return { onClose, onCopy, view };
}

const copyButton = () => screen.getByRole("button", { name: "Copy hours" });
const isOff = (el: HTMLElement) =>
  el.getAttribute("aria-disabled") === "true" ||
  (el as HTMLButtonElement).disabled;

describe("CopyDayDialog", () => {
  it("renders nothing while there is no source day", () => {
    setup(null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("names the source day and lists every other day", () => {
    setup(2);
    const dialog = screen.getByRole("dialog", {
      name: "Copy Wednesday's hours",
    });
    const labels = within(dialog)
      .getAllByRole("checkbox")
      .map((box) => box.closest("label")?.textContent);
    expect(labels).toEqual([
      "Monday",
      "Tuesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
  });

  it("will not copy until a day is chosen", () => {
    const { onCopy } = setup();
    expect(isOff(copyButton())).toBe(true);
    fireEvent.click(copyButton());
    expect(onCopy).not.toHaveBeenCalled();
  });

  it("sends the source and the chosen days, in the order chosen", () => {
    const { onCopy } = setup(0);
    fireEvent.click(screen.getByRole("checkbox", { name: "Friday" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Tuesday" }));
    fireEvent.click(copyButton());
    expect(onCopy).toHaveBeenCalledWith(0, [4, 1]);
  });

  it("drops a day that is unticked again, and blocks copying when none are left", () => {
    const { onCopy } = setup(0);
    const tuesday = screen.getByRole("checkbox", { name: "Tuesday" });
    fireEvent.click(tuesday);
    fireEvent.click(tuesday);
    expect(isOff(copyButton())).toBe(true);
    fireEvent.click(copyButton());
    expect(onCopy).not.toHaveBeenCalled();
  });

  it("closes through Cancel without copying", () => {
    const { onClose, onCopy } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCopy).not.toHaveBeenCalled();
  });

  it("closes with Escape", () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("starts with nothing ticked when opened for a different day", () => {
    const { view, onClose, onCopy } = setup(0);
    fireEvent.click(screen.getByRole("checkbox", { name: "Tuesday" }));
    view.rerender(
      <CopyDayDialog source={3} onClose={onClose} onCopy={onCopy} />,
    );
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).not.toBeChecked();
    }
    expect(isOff(copyButton())).toBe(true);
  });
});
