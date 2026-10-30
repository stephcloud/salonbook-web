import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import type { Availability, AvailabilityRule, Stylist } from "@/lib/api";
import { UNSAVED_MESSAGE } from "@/hooks/useUnsavedChangesWarning";
import { json, routeFetch } from "@/tests/route-fetch";
import { AvailabilitySection } from "./AvailabilitySection";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const ADA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const BEA = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ADA_URL = `/api/proxy/stylists/${ADA}/availability`;
const BEA_URL = `/api/proxy/stylists/${BEA}/availability`;
const GET_ADA = `GET ${ADA_URL}`;
const PUT_ADA = `PUT ${ADA_URL}`;
const GET_BEA = `GET ${BEA_URL}`;
const PUT_BEA = `PUT ${BEA_URL}`;

const STYLISTS: Stylist[] = [
  { id: ADA, name: "Ada", image_url: null, service_ids: [] },
  { id: BEA, name: "Bea", image_url: null, service_ids: [] },
];

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

const working = (day: number, start = "09:00:00", end = "17:00:00") =>
  rule("working", day, start, end);

function availability(
  rules: AvailabilityRule[],
  stylistId = ADA,
): Availability {
  return { stylist_id: stylistId, rules };
}

function renderSection(
  rules: AvailabilityRule[] | null,
  stylists: Stylist[] = STYLISTS,
) {
  return render(
    <QueryProvider>
      <AvailabilitySection
        stylists={stylists}
        initialAvailability={rules ? availability(rules) : null}
      />
    </QueryProvider>,
  );
}

const card = (name: string) => screen.getByRole("listitem", { name });
const select = (label: string) =>
  screen.getByLabelText(label) as HTMLSelectElement;
const shown = (label: string) => select(label).selectedOptions[0]?.textContent;
const pick = (label: string, minutes: number) =>
  fireEvent.change(select(label), { target: { value: String(minutes) } });
const toggleDay = (name: string) =>
  fireEvent.click(screen.getByRole("checkbox", { name: `Open on ${name}` }));
/** Buttons that stay focusable while disabled use aria-disabled, not the attribute. */
function isOff(element: HTMLElement) {
  return (
    element.getAttribute("aria-disabled") === "true" ||
    (element as HTMLButtonElement).disabled
  );
}
const saveButton = () =>
  screen.getByRole("button", { name: /Save hours|Saving/ });

beforeEach(() => refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("AvailabilitySection: the week", () => {
  it("shows Monday to Sunday as cards with Open and Closed badges", () => {
    renderSection([working(0), working(6, "10:30:00", "14:00:00")]);
    const names = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(names).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
    expect(within(card("Monday")).getByText("Open")).toBeInTheDocument();
    expect(within(card("Tuesday")).getByText("Closed")).toBeInTheDocument();
    expect(within(card("Sunday")).getByText("Open")).toBeInTheDocument();
  });

  it("names the stylist in the hours heading instead of repeating the page title", () => {
    renderSection([working(0)]);
    expect(
      screen.getByRole("heading", { level: 2, name: "Hours for Ada" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Weekly hours" })).toBeNull();
  });

  it("shows times in 12-hour form (weekday 0 is Monday)", () => {
    renderSection([working(0), working(6, "10:30:00", "14:00:00")]);
    expect(shown("Monday opens")).toBe("9:00 AM");
    expect(shown("Monday closes")).toBe("5:00 PM");
    expect(shown("Sunday opens")).toBe("10:30 AM");
    expect(shown("Sunday closes")).toBe("2:00 PM");
  });

  it("keeps a stored time that is not on the 15-minute grid", () => {
    renderSection([working(0, "09:10:00", "17:00:00")]);
    expect(shown("Monday opens")).toBe("9:10 AM");
  });

  it("labels every control and gives each a 44px target", () => {
    renderSection([working(0)]);
    expect(screen.getByLabelText("Stylist")).toBeInTheDocument();
    expect(select("Monday opens")).toHaveClass("min-h-11");
    expect(
      screen.getByRole("checkbox", { name: "Open on Monday" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
  });

  it("starts a break at lunchtime and removes it again", () => {
    renderSection([working(0)]);
    fireEvent.click(
      within(card("Monday")).getByRole("button", { name: /Add a break/ }),
    );
    expect(shown("Break 1 starts")).toBe("12:00 PM");
    expect(shown("Break 1 ends")).toBe("1:00 PM");
    fireEvent.click(
      screen.getByRole("button", { name: "Remove break 1 on Monday" }),
    );
    expect(screen.queryByLabelText("Break 1 starts")).toBeNull();
  });
});

describe("AvailabilitySection: validation before saving", () => {
  it("rejects an end that is not after the start, and sends nothing", () => {
    const api = routeFetch({});
    renderSection([working(0)]);
    pick("Monday closes", 480);
    expect(
      within(card("Monday")).getByText(
        "The end time must be after the start time.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(saveButton());
    expect(api.calls).toHaveLength(0);
    expect(
      screen.getByText("Fix the times marked in red, then save again."),
    ).toBeInTheDocument();
  });

  it("rejects a break outside the working hours", () => {
    renderSection([working(0)]);
    fireEvent.click(
      within(card("Monday")).getByRole("button", { name: /Add a break/ }),
    );
    pick("Break 1 ends", 1080);
    expect(
      within(card("Monday")).getByText(
        "The break must be inside the working hours (9:00 AM to 5:00 PM).",
      ),
    ).toBeInTheDocument();
  });

  it("rejects overlapping breaks", () => {
    renderSection([working(0)]);
    const add = within(card("Monday")).getByRole("button", {
      name: /Add a break/,
    });
    fireEvent.click(add);
    fireEvent.click(add);
    pick("Break 2 starts", 750);
    pick("Break 2 ends", 810);
    expect(
      within(card("Monday")).getByText("This break overlaps another break."),
    ).toBeInTheDocument();
  });
});

describe("AvailabilitySection: saving", () => {
  it("replaces everything: hours, breaks and the saved days off together", async () => {
    const api = routeFetch({
      [PUT_ADA]: () => json(availability([])),
    });
    renderSection([
      working(0),
      rule("break", 0, "12:00:00", "13:00:00"),
      rule("day_off", null, null, null, "2099-12-25"),
    ]);
    toggleDay("Tuesday");
    pick("Tuesday opens", 600);

    fireEvent.click(saveButton());

    await waitFor(() => expect(api.count(PUT_ADA)).toBe(1));
    expect(api.calls[0]?.body).toEqual({
      rules: [
        {
          kind: "working",
          weekday: 0,
          start_time: "09:00:00",
          end_time: "17:00:00",
          off_date: null,
        },
        {
          kind: "break",
          weekday: 0,
          start_time: "12:00:00",
          end_time: "13:00:00",
          off_date: null,
        },
        {
          kind: "working",
          weekday: 1,
          start_time: "10:00:00",
          end_time: "17:00:00",
          off_date: null,
        },
        {
          kind: "day_off",
          weekday: null,
          start_time: null,
          end_time: null,
          off_date: "2099-12-25",
        },
      ],
    });
  });

  it("says it saved, refreshes the dashboard data and clears the unsaved warning", async () => {
    routeFetch({
      [PUT_ADA]: (call) =>
        json(
          availability(
            (call.body as { rules: AvailabilityRule[] }).rules.map((r, i) => ({
              ...r,
              id: `saved-${i}`,
            })),
          ),
        ),
    });
    renderSection([]);
    toggleDay("Monday");
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();

    fireEvent.click(saveButton());

    expect(await screen.findByText("Hours saved for Ada.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("You have unsaved changes.")).toBeNull();
    expect(shown("Monday opens")).toBe("9:00 AM");
  });

  it("disables Save while sending, and a second click sends nothing", async () => {
    let finish: (r: Response) => void = () => {};
    const api = routeFetch({
      [PUT_ADA]: () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    });
    renderSection([]);
    toggleDay("Monday");

    fireEvent.click(saveButton());
    fireEvent.click(saveButton());

    await waitFor(() => expect(saveButton()).toHaveTextContent("Saving…"));
    expect(isOff(saveButton())).toBe(true);
    expect(api.count(PUT_ADA)).toBe(1);

    finish(json(availability([working(0)])));
    await waitFor(() => expect(saveButton()).toHaveTextContent("Save hours"));
    expect(isOff(saveButton())).toBe(false);
  });

  it("puts a server 422 on the row it came from", async () => {
    routeFetch({
      [PUT_ADA]: () =>
        json(
          {
            detail: [
              {
                type: "value_error",
                loc: ["body", "rules", 1],
                msg: "Value error, end_time must be after start_time",
              },
            ],
          },
          422,
        ),
    });
    renderSection([working(0)]);
    toggleDay("Tuesday");

    fireEvent.click(saveButton());

    expect(
      await within(card("Tuesday")).findByText(
        "The end time must be after the start time.",
      ),
    ).toBeInTheDocument();
    expect(
      within(card("Monday")).queryByText(/end time must be after/),
    ).toBeNull();
    expect(isOff(saveButton())).toBe(false);
  });

  it("puts the server's overlapping-breaks sentence on that weekday", async () => {
    routeFetch({
      [PUT_ADA]: () =>
        json({ detail: "overlapping break rules on weekday 2" }, 422),
    });
    renderSection([working(2)]);
    toggleDay("Monday");
    fireEvent.click(saveButton());
    expect(
      await within(card("Wednesday")).findByText(
        "Two breaks overlap. Change one of them.",
      ),
    ).toBeInTheDocument();
  });

  it("locks the form after a 401 (the browser is already heading to sign in)", async () => {
    routeFetch({
      [PUT_ADA]: () => json({ detail: "invalid credentials" }, 401),
    });
    vi.stubGlobal("location", {
      ...window.location,
      assign: vi.fn(),
      pathname: "/dashboard/availability",
      search: "",
    });
    renderSection([]);
    toggleDay("Monday");
    fireEvent.click(saveButton());
    expect(
      await screen.findByText("Please sign in again."),
    ).toBeInTheDocument();
    expect(isOff(saveButton())).toBe(true);
  });

  it("shows the connection message when the server cannot be reached", async () => {
    routeFetch({
      [PUT_ADA]: () => {
        throw new TypeError("fetch failed");
      },
    });
    renderSection([]);
    toggleDay("Monday");
    fireEvent.click(saveButton());
    expect(
      await screen.findByText(/Could not reach the server/),
    ).toBeInTheDocument();
    expect(isOff(saveButton())).toBe(false);
  });
});

describe("AvailabilitySection: hours the page cannot show", () => {
  const split = [
    working(1, "09:00:00", "12:00:00"),
    working(1, "13:00:00", "17:00:00"),
  ];

  it("warns, and will not save until the owner agrees to replace them", async () => {
    const api = routeFetch({ [PUT_ADA]: () => json(availability([])) });
    renderSection(split);
    expect(
      screen.getByText(/Tuesday has 2 separate blocks of hours/),
    ).toBeInTheDocument();
    expect(isOff(saveButton())).toBe(true);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Replace them with what is shown/ }),
    );
    expect(isOff(saveButton())).toBe(false);
    fireEvent.click(saveButton());
    await waitFor(() => expect(api.count(PUT_ADA)).toBe(1));
  });

  it("also blocks day-off changes, which would resend the same hours", () => {
    renderSection(split);
    expect(screen.getByLabelText("Date")).toBeDisabled();
    expect(isOff(screen.getByRole("button", { name: "Add a day off" }))).toBe(
      true,
    );
  });
});

describe("AvailabilitySection: leaving with unsaved changes", () => {
  it("asks the browser before the tab closes, only while there are changes", () => {
    renderSection([working(0)]);
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    toggleDay("Tuesday");
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it("asks before a link inside the app is followed", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <QueryProvider>
        <a href="/dashboard">Dashboard</a>
        <AvailabilitySection
          stylists={STYLISTS}
          initialAvailability={availability([])}
        />
      </QueryProvider>,
    );
    toggleDay("Tuesday");
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    screen.getByRole("link", { name: "Dashboard" }).dispatchEvent(click);
    expect(confirm).toHaveBeenCalledWith(UNSAVED_MESSAGE);
    expect(click.defaultPrevented).toBe(true);
    confirm.mockRestore();
  });

  it("asks before switching stylist, and stays when the owner says no", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderSection([working(0)]);
    toggleDay("Tuesday");
    fireEvent.change(screen.getByLabelText("Stylist"), {
      target: { value: BEA },
    });
    expect(confirm).toHaveBeenCalledWith(UNSAVED_MESSAGE);
    expect((screen.getByLabelText("Stylist") as HTMLSelectElement).value).toBe(
      ADA,
    );
    expect(
      screen.getByRole("checkbox", { name: "Open on Tuesday" }),
    ).toBeChecked();
    confirm.mockRestore();
  });

  it("switches without asking when nothing changed, and loads that stylist", async () => {
    const confirm = vi.spyOn(window, "confirm");
    routeFetch({
      [GET_BEA]: () =>
        json(availability([working(2, "08:00:00", "12:00:00")], BEA)),
    });
    renderSection([working(0)]);
    fireEvent.change(screen.getByLabelText("Stylist"), {
      target: { value: BEA },
    });
    expect(confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(shown("Wednesday opens")).toBe("8:00 AM"));
    confirm.mockRestore();
  });
});

describe("AvailabilitySection: loading, errors and empty", () => {
  it("shows a loading message, then an error with Try again, then the hours", async () => {
    let calls = 0;
    routeFetch({
      [GET_BEA]: () => {
        calls += 1;
        return calls <= 2
          ? json({ detail: "boom" }, 500)
          : json(availability([working(3)], BEA));
      },
    });
    renderSection([working(0)]);
    fireEvent.change(screen.getByLabelText("Stylist"), {
      target: { value: BEA },
    });
    expect(screen.getByText("Loading Bea's hours…")).toBeInTheDocument();

    expect(
      await screen.findByText(/We could not load these hours/, undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(shown("Thursday opens")).toBe("9:00 AM"));
  });

  it("loads the first stylist itself when the server could not read it", async () => {
    routeFetch({ [GET_ADA]: () => json(availability([working(4)])) });
    renderSection(null);
    await waitFor(() => expect(shown("Friday opens")).toBe("9:00 AM"));
  });

  it("explains an empty salon and links to stylists and back to the dashboard", () => {
    renderSection(null, []);
    expect(screen.getByText("No stylists yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a stylist" })).toHaveAttribute(
      "href",
      "/dashboard/stylists",
    );
    expect(
      screen.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("button", { name: "Save hours" })).toBeNull();
  });
});

describe("AvailabilitySection: copy this day's hours", () => {
  it("copies hours and breaks to the chosen days, unsaved until Save hours", async () => {
    const api = routeFetch({ [PUT_ADA]: () => json(availability([])) });
    renderSection([working(0), rule("break", 0, "12:00:00", "13:00:00")]);

    fireEvent.click(
      within(card("Monday")).getByRole("button", {
        name: /Copy this day's hours to other days/,
      }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).queryByRole("checkbox", { name: "Monday" }),
    ).toBeNull();
    expect(
      isOff(within(dialog).getByRole("button", { name: "Copy hours" })),
    ).toBe(true);
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Wednesday" }),
    );
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Friday" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Copy hours" }));

    expect(api.calls).toHaveLength(0);
    expect(within(card("Wednesday")).getByText("Open")).toBeInTheDocument();
    expect(within(card("Friday")).getByText("Open")).toBeInTheDocument();
    expect(within(card("Thursday")).getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();

    fireEvent.click(saveButton());
    await waitFor(() => expect(api.count(PUT_ADA)).toBe(1));
    const sent = (api.calls[0]?.body as { rules: AvailabilityRule[] }).rules;
    expect(
      sent.map((r) => `${r.kind}:${r.weekday}:${r.start_time}-${r.end_time}`),
    ).toEqual([
      "working:0:09:00:00-17:00:00",
      "break:0:12:00:00-13:00:00",
      "working:2:09:00:00-17:00:00",
      "break:2:12:00:00-13:00:00",
      "working:4:09:00:00-17:00:00",
      "break:4:12:00:00-13:00:00",
    ]);
  });
});

describe("AvailabilitySection: copy to another stylist", () => {
  async function openCopyDialog() {
    fireEvent.click(
      screen.getByRole("button", { name: "Copy to another stylist" }),
    );
    return screen.getByRole("dialog");
  }

  it("needs a confirmation, keeps the other stylist's days off, and says it replaced their hours", async () => {
    const api = routeFetch({
      [GET_BEA]: () =>
        json(
          availability(
            [working(5), rule("day_off", null, null, null, "2099-01-01")],
            BEA,
          ),
        ),
      [PUT_BEA]: () => json(availability([], BEA)),
    });
    renderSection([
      working(0),
      rule("day_off", null, null, null, "2099-02-02"),
    ]);
    const dialog = await openCopyDialog();
    expect(within(dialog).getByText(/replaces all of Bea/)).toBeInTheDocument();
    const copy = within(dialog).getByRole("button", { name: "Copy hours" });
    expect(isOff(copy)).toBe(true);

    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /Yes, replace Bea/ }),
    );
    fireEvent.click(copy);

    expect(await screen.findByText("Hours copied to Bea.")).toBeInTheDocument();
    const sent = (
      api.calls.find((c) => c.key === PUT_BEA)?.body as {
        rules: AvailabilityRule[];
      }
    ).rules;
    expect(sent.map((r) => `${r.kind}:${r.weekday ?? r.off_date}`)).toEqual([
      "working:0",
      "day_off:2099-01-01",
    ]);
    expect(refresh).toHaveBeenCalled();
  });

  it("copies the days off too when asked, without reading the other stylist first", async () => {
    const api = routeFetch({ [PUT_BEA]: () => json(availability([], BEA)) });
    renderSection([
      working(0),
      rule("day_off", null, null, null, "2099-02-02"),
    ]);
    const dialog = await openCopyDialog();
    fireEvent.click(
      within(dialog).getByRole("checkbox", {
        name: /Also copy Ada's days off/,
      }),
    );
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /Yes, replace Bea/ }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Copy hours" }));
    await screen.findByText("Hours copied to Bea.");
    expect(api.count(GET_BEA)).toBe(0);
    const sent = (api.calls[0]?.body as { rules: AvailabilityRule[] }).rules;
    expect(sent.map((r) => r.off_date).filter(Boolean)).toEqual(["2099-02-02"]);
  });

  it("shows the server's message and stays open when the copy fails", async () => {
    routeFetch({
      [GET_BEA]: () => json(availability([], BEA)),
      [PUT_BEA]: () => json({ detail: "forbidden" }, 403),
    });
    renderSection([working(0)]);
    const dialog = await openCopyDialog();
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: /Yes, replace Bea/ }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Copy hours" }));
    expect(
      await within(dialog).findByText(
        /only change hours for stylists in your own salon/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("will not copy hours that fail the checks", () => {
    renderSection([working(0)]);
    pick("Monday closes", 480);
    fireEvent.click(
      screen.getByRole("button", { name: "Copy to another stylist" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByText(/Fix the times marked in red before copying/),
    ).toBeInTheDocument();
  });

  it("is not offered when there is only one stylist", () => {
    renderSection([working(0)], STYLISTS.slice(0, 1));
    expect(
      screen.queryByRole("button", { name: "Copy to another stylist" }),
    ).toBeNull();
  });
});
