import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DayDraft } from "@/lib/availability/draft";
import { DayHoursCard } from "./DayHoursCard";

function setup(
  day: Partial<DayDraft>,
  props: {
    hoursError?: string | null;
    breakErrors?: (string | null)[];
    disabled?: boolean;
  } = {},
) {
  const onChange = vi.fn<(next: DayDraft) => void>();
  const onCopy = vi.fn();
  render(
    <ul>
      <DayHoursCard
        name="Monday"
        idPrefix="mon"
        day={{ open: true, start: 540, end: 1020, breaks: [], ...day }}
        hoursError={props.hoursError ?? null}
        breakErrors={props.breakErrors ?? []}
        disabled={props.disabled ?? false}
        onChange={onChange}
        onCopy={onCopy}
      />
    </ul>,
  );
  return { onChange, onCopy };
}

function lastDay(onChange: ReturnType<typeof vi.fn<(next: DayDraft) => void>>) {
  const call = onChange.mock.calls.at(-1);
  if (!call) throw new Error("onChange was not called");
  return call[0];
}

const addBreak = () =>
  fireEvent.click(screen.getByRole("button", { name: /Add a break/ }));

describe("DayHoursCard: closed day", () => {
  it("says customers cannot book, shows no times and offers no copy or break buttons", () => {
    setup({ open: false });
    expect(
      screen.getByText("Closed. Customers cannot book Monday."),
    ).toBeVisible();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.queryByLabelText("Monday opens")).toBeNull();
    expect(screen.queryByRole("button", { name: /Add a break/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Copy this day/ })).toBeNull();
  });

  it("opens the day through the checkbox, keeping its other values", () => {
    const { onChange } = setup({ open: false, start: 600 });
    fireEvent.click(screen.getByRole("checkbox", { name: "Open on Monday" }));
    expect(lastDay(onChange)).toMatchObject({ open: true, start: 600 });
  });
});

describe("DayHoursCard: open day", () => {
  it("shows the Open badge and the times", () => {
    setup({});
    expect(screen.getByText("Open")).toBeInTheDocument();
    const opens = screen.getByLabelText("Monday opens") as HTMLSelectElement;
    expect(opens.selectedOptions[0]?.textContent).toBe("9:00 AM");
  });

  it("closes the day through the checkbox", () => {
    const { onChange } = setup({});
    fireEvent.click(screen.getByRole("checkbox", { name: "Open on Monday" }));
    expect(lastDay(onChange).open).toBe(false);
  });

  it("changes the start and the end", () => {
    const { onChange } = setup({});
    fireEvent.change(screen.getByLabelText("Monday opens"), {
      target: { value: "600" },
    });
    expect(lastDay(onChange).start).toBe(600);
    fireEvent.change(screen.getByLabelText("Monday closes"), {
      target: { value: "1080" },
    });
    expect(lastDay(onChange).end).toBe(1080);
  });

  it("passes the copy request on", () => {
    const { onCopy } = setup({});
    fireEvent.click(
      screen.getByRole("button", { name: /Copy this day's hours/ }),
    );
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("shows the hours error as an alert tied to both selects", () => {
    setup({}, { hoursError: "The end time must be after the start time." });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "The end time must be after the start time.",
    );
    for (const label of ["Monday opens", "Monday closes"]) {
      const select = screen.getByLabelText(label);
      expect(select).toHaveAttribute("aria-invalid", "true");
      expect(select).toHaveAttribute("aria-describedby", alert.id);
    }
  });

  it("disables every control while disabled", () => {
    setup({ breaks: [{ start: 720, end: 780 }] }, { disabled: true });
    expect(screen.getByLabelText("Monday opens")).toBeDisabled();
    expect(screen.getByLabelText("Break 1 starts")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Add a break/ })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Remove break 1 on Monday" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Copy this day's hours/ }),
    ).toBeDisabled();
  });
});

describe("DayHoursCard: breaks", () => {
  it("adds a one-hour break at 12:00 when lunchtime is inside the hours", () => {
    const { onChange } = setup({});
    addBreak();
    expect(lastDay(onChange).breaks).toEqual([{ start: 720, end: 780 }]);
  });

  it("starts the break at opening time when hours end before lunch", () => {
    const { onChange } = setup({ start: 480, end: 690 });
    addBreak();
    expect(lastDay(onChange).breaks).toEqual([{ start: 480, end: 540 }]);
  });

  it("starts the break at opening time when hours begin after lunch", () => {
    const { onChange } = setup({ start: 840, end: 1200 });
    addBreak();
    expect(lastDay(onChange).breaks).toEqual([{ start: 840, end: 900 }]);
  });

  it("starts at opening time when lunch would run past closing", () => {
    const { onChange } = setup({ start: 600, end: 750 });
    addBreak();
    expect(lastDay(onChange).breaks).toEqual([{ start: 600, end: 660 }]);
  });

  it("never ends the default break past a short day's closing time", () => {
    const { onChange } = setup({ start: 480, end: 510 });
    addBreak();
    expect(lastDay(onChange).breaks).toEqual([{ start: 480, end: 510 }]);
  });

  it("appends to existing breaks", () => {
    const { onChange } = setup({ breaks: [{ start: 600, end: 630 }] });
    addBreak();
    expect(lastDay(onChange).breaks).toEqual([
      { start: 600, end: 630 },
      { start: 720, end: 780 },
    ]);
  });

  it("edits only the chosen break", () => {
    const { onChange } = setup({
      breaks: [
        { start: 600, end: 630 },
        { start: 720, end: 780 },
      ],
    });
    fireEvent.change(screen.getByLabelText("Break 2 starts"), {
      target: { value: "735" },
    });
    expect(lastDay(onChange).breaks).toEqual([
      { start: 600, end: 630 },
      { start: 735, end: 780 },
    ]);
    fireEvent.change(screen.getByLabelText("Break 1 ends"), {
      target: { value: "645" },
    });
    expect(lastDay(onChange).breaks).toEqual([
      { start: 600, end: 645 },
      { start: 720, end: 780 },
    ]);
  });

  it("removes only the chosen break", () => {
    const { onChange } = setup({
      breaks: [
        { start: 600, end: 630 },
        { start: 720, end: 780 },
      ],
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Remove break 1 on Monday" }),
    );
    expect(lastDay(onChange).breaks).toEqual([{ start: 720, end: 780 }]);
  });

  it("shows a break's error beside that break only", () => {
    setup(
      {
        breaks: [
          { start: 600, end: 630 },
          { start: 720, end: 780 },
        ],
      },
      { breakErrors: [null, "Two breaks overlap."] },
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Two breaks overlap.");
    expect(screen.getByLabelText("Break 2 starts")).toHaveAttribute(
      "aria-describedby",
      alert.id,
    );
    expect(screen.getByLabelText("Break 1 starts")).not.toHaveAttribute(
      "aria-invalid",
    );
    const list = screen.getByRole("list", { name: "Monday breaks" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows no breaks list when there are none", () => {
    setup({});
    expect(screen.queryByRole("list", { name: "Monday breaks" })).toBeNull();
  });
});
