import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Availability } from "@/lib/api";
import { json, routeFetch } from "@/tests/route-fetch";
import { HoursForm } from "./HoursForm";
import { StylistHoursEditor } from "./StylistHoursEditor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

const ADA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const STYLIST = { id: ADA, name: "Ada" };

function hours(start: string): Availability {
  return {
    stylist_id: ADA,
    rules: [
      {
        id: `r-${start}`,
        kind: "working",
        weekday: 0,
        start_time: start,
        end_time: "17:00:00",
        off_date: null,
      },
    ],
  };
}

function setup(data: Availability) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tree = (value: Availability) => (
    <QueryClientProvider client={client}>
      <HoursForm
        stylist={STYLIST}
        others={[]}
        availability={value}
        onDirtyChange={() => {}}
      />
    </QueryClientProvider>
  );
  const view = render(tree(data));
  return {
    client,
    rerender: (value: Availability) => view.rerender(tree(value)),
  };
}

const opens = () =>
  (screen.getByLabelText("Monday opens") as HTMLSelectElement)
    .selectedOptions[0]?.textContent;

afterEach(() => vi.unstubAllGlobals());

describe("HoursForm: saved hours change underneath", () => {
  it("shows new saved hours when there are no edits, with no false unsaved warning", () => {
    const { rerender } = setup(hours("09:00:00"));
    expect(opens()).toBe("9:00 AM");
    rerender(hours("10:00:00"));
    expect(opens()).toBe("10:00 AM");
    expect(screen.queryByText("You have unsaved changes.")).toBeNull();
  });

  it("keeps the owner's edits when the saved hours change", () => {
    const { rerender } = setup(hours("09:00:00"));
    fireEvent.change(screen.getByLabelText("Monday opens"), {
      target: { value: String(8 * 60) },
    });
    rerender(hours("10:00:00"));
    expect(opens()).toBe("8:00 AM");
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();
  });
});

describe("the hours query: no background read can replace what is on screen", () => {
  it("does not refetch on window focus or when the editor mounts again", async () => {
    const api = routeFetch({
      [`GET /api/proxy/stylists/${ADA}/availability`]: () =>
        json(hours("08:00:00")),
    });
    const client = new QueryClient();
    const tree = (
      <QueryClientProvider client={client}>
        <StylistHoursEditor
          stylist={{ id: ADA, name: "Ada", image_url: null, service_ids: [] }}
          others={[]}
          initialAvailability={hours("09:00:00")}
          onDirtyChange={() => {}}
        />
      </QueryClientProvider>
    );
    const view = render(tree);
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    view.unmount();
    render(tree);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(api.calls).toHaveLength(0);
    expect(opens()).toBe("9:00 AM");
  });
});
