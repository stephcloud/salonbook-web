import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimeSelect } from "./TimeSelect";

function setup(props: Partial<Parameters<typeof TimeSelect>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <TimeSelect
      id="t"
      label="Monday opens"
      value={540}
      onChange={onChange}
      {...props}
    />,
  );
  const select = screen.getByLabelText("Monday opens") as HTMLSelectElement;
  return { select, onChange };
}

describe("TimeSelect", () => {
  it("offers every 15 minutes in 12-hour form and shows the current value", () => {
    const { select } = setup();
    expect(select.options).toHaveLength(96);
    expect(select.options[0]?.textContent).toBe("12:00 AM");
    expect(select.options[95]?.textContent).toBe("11:45 PM");
    expect(select.selectedOptions[0]?.textContent).toBe("9:00 AM");
  });

  it("reports the chosen time as minutes since midnight", () => {
    const { select, onChange } = setup();
    fireEvent.change(select, { target: { value: "825" } });
    expect(onChange).toHaveBeenCalledWith(825);
  });

  it("keeps a stored time that is off the grid, in order, without losing the others", () => {
    const { select } = setup({ value: 550 });
    expect(select.options).toHaveLength(97);
    expect(select.selectedOptions[0]?.textContent).toBe("9:10 AM");
    const texts = Array.from(select.options).map((o) => o.textContent);
    expect(texts.indexOf("9:10 AM")).toBe(texts.indexOf("9:00 AM") + 1);
  });

  it("can be disabled", () => {
    const { select } = setup({ disabled: true });
    expect(select).toBeDisabled();
  });

  it("marks itself invalid and points at the error message", () => {
    const { select } = setup({ invalid: true, describedBy: "err" });
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute("aria-describedby", "err");
  });

  it("has no invalid marking by default", () => {
    const { select } = setup();
    expect(select).not.toHaveAttribute("aria-invalid");
    expect(select).not.toHaveAttribute("aria-describedby");
  });
});
