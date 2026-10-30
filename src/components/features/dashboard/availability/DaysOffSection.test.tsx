import {
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import type { Availability, AvailabilityRule } from "@/lib/api";
import { json, routeFetch } from "@/tests/route-fetch";
import { AvailabilitySection } from "./AvailabilitySection";
import { DaysOffSection } from "./DaysOffSection";

// These timed out under the full suite's load; this file only, not the suite.
vi.setConfig({ testTimeout: 20_000 });
configure({ asyncUtilTimeout: 5_000 });

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const ADA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PUT_ADA = `PUT /api/proxy/stylists/${ADA}/availability`;

let counter = 0;
function rule(
  kind: AvailabilityRule["kind"],
  weekday: number | null,
  start: string | null,
  end: string | null,
  off: string | null = null,
): AvailabilityRule {
  counter += 1;
  return {
    id: `rule-${counter}`,
    kind,
    weekday,
    start_time: start,
    end_time: end,
    off_date: off,
  };
}

const dayOff = (date: string) => rule("day_off", null, null, null, date);
const monday = () => rule("working", 0, "09:00:00", "17:00:00");

function renderSection(rules: AvailabilityRule[]) {
  const initial: Availability = { stylist_id: ADA, rules };
  return render(
    <QueryProvider>
      <AvailabilitySection
        stylists={[{ id: ADA, name: "Ada", image_url: null, service_ids: [] }]}
        initialAvailability={initial}
      />
    </QueryProvider>,
  );
}

/** What the API would answer to a PUT: the same rules with ids. */
function echo(call: { body: unknown }) {
  return json({
    stylist_id: ADA,
    rules: (call.body as { rules: AvailabilityRule[] }).rules.map((r, i) => ({
      ...r,
      id: `echo-${i}`,
    })),
  });
}

function addDate(value: string) {
  fireEvent.change(screen.getByLabelText("Date"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Add a day off" }));
}

beforeEach(() => refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("Days off: the list", () => {
  it("lists upcoming days off in order, in Lagos date form, and hides past ones", () => {
    renderSection([
      dayOff("2099-03-02"),
      dayOff("2099-01-05"),
      dayOff("2020-01-01"),
    ]);
    expect(screen.queryByText(/1 Jan 2020/)).toBeNull();
    const first = screen.getByText("Mon, 5 Jan 2099");
    const second = screen.getByText("Mon, 2 Mar 2099");
    expect(
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows an empty message when there are none", () => {
    renderSection([monday()]);
    expect(screen.getByText("No upcoming days off.")).toBeInTheDocument();
  });

  it("says plainly that existing bookings are not cancelled", () => {
    renderSection([]);
    expect(
      screen.getByText(/Bookings already made for that day are not cancelled/),
    ).toBeInTheDocument();
  });
});

describe("Days off: add", () => {
  it("saves at once, sending the SAVED hours and the new day, then clears the field", async () => {
    const api = routeFetch({ [PUT_ADA]: echo });
    renderSection([monday(), dayOff("2099-01-05")]);

    // An hours edit that is not saved must not ride along with a day-off save.
    fireEvent.click(screen.getByRole("checkbox", { name: "Open on Tuesday" }));
    addDate("2099-06-01");

    await screen.findByText("Day off added.");
    const sent = (api.calls[0]?.body as { rules: AvailabilityRule[] }).rules;
    expect(sent.map((r) => `${r.kind}:${r.weekday ?? r.off_date}`)).toEqual([
      "working:0",
      "day_off:2099-01-05",
      "day_off:2099-06-01",
    ]);
    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe("");
    expect(screen.getByText("Mon, 1 Jun 2099")).toBeInTheDocument();
    // The unsaved Tuesday edit is still there, still unsaved.
    expect(
      screen.getByRole("checkbox", { name: "Open on Tuesday" }),
    ).toBeChecked();
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("will not add a day in the past, and sends nothing", () => {
    const api = routeFetch({});
    renderSection([monday()]);
    addDate("2020-01-01");
    expect(
      screen.getByText(
        "Choose today or a later day. Past days cannot be added.",
      ),
    ).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it("asks for a date, and refuses a day that is already off", () => {
    const api = routeFetch({});
    renderSection([dayOff("2099-01-05")]);
    addDate("");
    expect(screen.getByText("Choose a date.")).toBeInTheDocument();
    addDate("2099-01-05");
    expect(
      screen.getByText("That day is already marked as a day off."),
    ).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it("sets the date input's minimum to today so the picker hides past days", () => {
    renderSection([]);
    const min = (screen.getByLabelText("Date") as HTMLInputElement).min;
    expect(min).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("shows the server's message when it refuses, and keeps the typed date", async () => {
    routeFetch({
      [PUT_ADA]: () => json({ detail: "duplicate day_off date" }, 422),
    });
    renderSection([monday()]);
    addDate("2099-06-01");
    expect(
      await screen.findByText("That day is already marked as a day off."),
    ).toBeInTheDocument();
    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe(
      "2099-06-01",
    );
  });

  it("shows a clash message from the API as it is written", async () => {
    routeFetch({
      [PUT_ADA]: () =>
        json(
          { detail: "Ada has 2 bookings on that day. Cancel them first." },
          409,
        ),
    });
    renderSection([monday()]);
    addDate("2099-06-01");
    expect(
      await screen.findByText(
        "Ada has 2 bookings on that day. Cancel them first.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mon, 1 Jun 2099")).toBeNull();
  });

  it("sends only one request for a double click", async () => {
    let finish: (r: Response) => void = () => {};
    const api = routeFetch({
      [PUT_ADA]: () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    });
    renderSection([monday()]);
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2099-06-01" },
    });
    const button = screen.getByRole("button", { name: "Add a day off" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(api.count(PUT_ADA)).toBe(1));
    expect(screen.getByLabelText("Date")).toBeDisabled();
    finish(json({ stylist_id: ADA, rules: [] }));
    await waitFor(() => expect(screen.getByLabelText("Date")).toBeEnabled());
  });
});

describe("Days off: remove", () => {
  it("removes one day off at once and keeps the others and the hours", async () => {
    const api = routeFetch({ [PUT_ADA]: echo });
    renderSection([monday(), dayOff("2099-01-05"), dayOff("2099-03-02")]);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove day off Mon, 5 Jan 2099" }),
    );

    await screen.findByText("Day off removed.");
    const sent = (api.calls[0]?.body as { rules: AvailabilityRule[] }).rules;
    expect(sent.map((r) => `${r.kind}:${r.weekday ?? r.off_date}`)).toEqual([
      "working:0",
      "day_off:2099-03-02",
    ]);
    expect(screen.queryByText("Mon, 5 Jan 2099")).toBeNull();
    expect(screen.getByText("Mon, 2 Mar 2099")).toBeInTheDocument();
  });

  it("keeps the day in the list and says why when the removal fails", async () => {
    routeFetch({ [PUT_ADA]: () => json({ detail: "boom" }, 500) });
    renderSection([monday(), dayOff("2099-01-05")]);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove day off Mon, 5 Jan 2099" }),
    );
    expect(
      await screen.findByText(/went wrong on our side/),
    ).toBeInTheDocument();
    expect(screen.getByText("Mon, 5 Jan 2099")).toBeInTheDocument();
  });
});

describe("DaysOffSection on its own", () => {
  it("labels the remove buttons and the date field", () => {
    render(
      <DaysOffSection
        daysOff={["2099-01-05"]}
        disabled={false}
        serverError={null}
        onAdd={async () => true}
        onRemove={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Remove day off Mon, 5 Jan 2099" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
  });

  it("does not clear the date when the add did not work", async () => {
    render(
      <DaysOffSection
        daysOff={[]}
        disabled={false}
        serverError={null}
        onAdd={async () => false}
        onRemove={() => {}}
      />,
    );
    addDate("2099-06-01");
    await waitFor(() =>
      expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe(
        "2099-06-01",
      ),
    );
  });
});
