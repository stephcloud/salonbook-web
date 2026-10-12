import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "@/components/features/auth/LogoutButton";
import { UNSAVED_MESSAGE } from "@/hooks/useUnsavedChangesWarning";
import type { Availability, AvailabilityRule, Stylist } from "@/lib/api";
import { json, routeFetch } from "@/tests/route-fetch";
import { AvailabilitySection } from "./AvailabilitySection";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const ADA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const BEA = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const URL_ADA = `/api/proxy/stylists/${ADA}/availability`;
const URL_BEA = `/api/proxy/stylists/${BEA}/availability`;
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
const monday = (start = "09:00:00") => rule("working", 0, start, "17:00:00");
const hours = (rules: AvailabilityRule[], id = ADA): Availability => ({
  stylist_id: id,
  rules,
});

function renderSection(
  rules: AvailabilityRule[],
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  extra?: React.ReactNode,
) {
  return render(
    <QueryClientProvider client={client}>
      {extra}
      <AvailabilitySection
        stylists={STYLISTS}
        initialAvailability={hours(rules)}
      />
    </QueryClientProvider>,
  );
}

const opens = () =>
  (screen.getByLabelText("Monday opens") as HTMLSelectElement)
    .selectedOptions[0]?.textContent;
const saveButton = () =>
  screen.getByRole("button", { name: /Save hours|Saving/ });

beforeEach(() => refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("coming back to the first stylist", () => {
  it("never shows the page-load snapshot again, even after the cache expired", async () => {
    // gcTime 0: leaving a stylist throws its cached hours away, like the 5 minute expiry.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    routeFetch({
      // What the server says now: Ada was saved at 11:00 since the page loaded at 9:00.
      [`GET ${URL_ADA}`]: () => json(hours([monday("11:00:00")])),
      [`GET ${URL_BEA}`]: () => json(hours([], BEA)),
    });
    renderSection([monday("09:00:00")], client);
    expect(opens()).toBe("9:00 AM");

    fireEvent.change(screen.getByLabelText("Stylist"), {
      target: { value: BEA },
    });
    await screen.findByRole("button", { name: "Save hours" });
    fireEvent.change(screen.getByLabelText("Stylist"), {
      target: { value: ADA },
    });

    // Not the old 9:00 snapshot, not even for a moment: it loads the real hours.
    expect(screen.queryByLabelText("Monday opens")).toBeNull();
    expect(screen.getByText("Loading Ada's hours…")).toBeInTheDocument();
    await waitFor(() => expect(opens()).toBe("11:00 AM"));
  });
});

describe("a refused day-off save while hours are being edited", () => {
  it("does not blame the row the owner is editing", async () => {
    routeFetch({
      [`PUT ${URL_ADA}`]: () =>
        json(
          {
            detail: [
              {
                type: "value_error",
                loc: ["body", "rules", 0],
                msg: "Value error, end_time must be after start_time",
              },
            ],
          },
          422,
        ),
    });
    renderSection([monday()]);
    // Unsaved edit to Monday: the saved rule at position 0 is also Monday, but it is not this one.
    fireEvent.change(screen.getByLabelText("Monday opens"), {
      target: { value: String(8 * 60) },
    });
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2099-06-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add a day off" }));

    const alert = await screen.findByText(/A saved rule was refused/);
    expect(alert).toHaveTextContent(
      "Monday: The end time must be after the start time.",
    );
    const mondayCard = screen.getByRole("listitem", { name: "Monday" });
    expect(within(mondayCard).queryByText(/end time must be after/)).toBeNull();
    // The unsaved edit is untouched.
    expect(opens()).toBe("8:00 AM");
  });
});

describe("the saved message", () => {
  it("appears beside the Save button, not at the top of the page", async () => {
    routeFetch({
      [`PUT ${URL_ADA}`]: (call) =>
        json(
          hours(
            (call.body as { rules: AvailabilityRule[] }).rules.map((r, i) => ({
              ...r,
              id: `s-${i}`,
            })),
          ),
        ),
    });
    renderSection([monday()]);
    fireEvent.change(screen.getByLabelText("Monday opens"), {
      target: { value: String(8 * 60) },
    });
    fireEvent.click(saveButton());

    const message = await screen.findByText("Hours saved for Ada.");
    expect(message.parentElement).toBe(saveButton().parentElement);
    expect(message).toHaveAttribute("role", "status");
  });
});

describe("leaving with unsaved changes by Sign out", () => {
  it("asks first, and does not sign out when the owner says no", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const api = routeFetch({});
    renderSection([monday()], undefined, <LogoutButton />);
    fireEvent.change(screen.getByLabelText("Monday opens"), {
      target: { value: String(8 * 60) },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(confirm).toHaveBeenCalledWith(UNSAVED_MESSAGE);
    expect(api.calls).toHaveLength(0);
    expect(opens()).toBe("8:00 AM");
    confirm.mockRestore();
  });

  it("does not ask when nothing changed", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    routeFetch({ "POST /api/auth/logout": () => json({}) });
    renderSection([monday()], undefined, <LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
