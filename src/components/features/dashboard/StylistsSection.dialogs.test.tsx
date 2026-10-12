import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import type { Service, Stylist } from "@/lib/api";
import { json, routeFetch } from "@/tests/route-fetch";
import { StylistsSection } from "./StylistsSection";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const SALON = "11111111-1111-4111-8111-111111111111";
const BRAIDS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ADA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CREATE = "POST /api/dashboard/stylists";
const ASSIGN = `PUT /api/proxy/stylists/${ADA}/services`;
const WAKING = /Waking up the server/;

const SERVICES: Service[] = [
  {
    id: BRAIDS,
    salon_id: SALON,
    name: "Braids",
    duration_minutes: 60,
    price_type: "fixed",
    price: 500000,
    created_at: "2026-10-12T00:00:00Z",
  },
];
const ADA_STYLIST: Stylist = {
  id: ADA,
  name: "Ada",
  image_url: null,
  service_ids: [BRAIDS],
};

function renderSection(stylists: Stylist[]) {
  return render(
    <QueryProvider>
      <StylistsSection
        salonId={SALON}
        initialServices={SERVICES}
        initialStylists={stylists}
      />
    </QueryProvider>,
  );
}

function openAssign() {
  fireEvent.click(screen.getByRole("button", { name: "Services for Ada" }));
}

function submitNewStylist() {
  fireEvent.click(screen.getByRole("button", { name: "Add a stylist" }));
  fireEvent.change(screen.getByLabelText("Stylist name"), {
    target: { value: "Bola" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add stylist" }));
}

function stubSignedOutLocation() {
  const assign = vi.fn();
  vi.stubGlobal("location", {
    ...window.location,
    assign,
    pathname: "/dashboard/stylists",
    search: "",
  });
  return assign;
}

const signedOut = () => json({ error: "Please sign in again." }, 401);

beforeEach(() => refresh.mockReset());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("StylistsSection dialogs: signed out", () => {
  it("add: goes to /login?next= and keeps the buttons locked", async () => {
    const assign = stubSignedOutLocation();
    routeFetch({ [CREATE]: signedOut });
    renderSection([]);
    submitNewStylist();

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "/login?next=%2Fdashboard%2Fstylists",
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add stylist" }),
      ).toHaveAttribute("aria-disabled", "true"),
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("assign: goes to /login?next= and keeps the buttons locked", async () => {
    const assign = stubSignedOutLocation();
    routeFetch({ [ASSIGN]: signedOut });
    renderSection([ADA_STYLIST]);
    openAssign();
    fireEvent.click(screen.getByRole("button", { name: "Save services" }));

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "/login?next=%2Fdashboard%2Fstylists",
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save services" }),
      ).toHaveAttribute("aria-disabled", "true"),
    );
    expect(screen.getByRole("checkbox", { name: /Braids/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

describe("StylistsSection dialogs: slow server", () => {
  it("assign: says the server is waking up only after 4 seconds", async () => {
    vi.useFakeTimers();
    routeFetch({ [ASSIGN]: () => new Promise<Response>(() => {}) });
    renderSection([ADA_STYLIST]);
    openAssign();
    fireEvent.click(screen.getByRole("button", { name: "Save services" }));
    await act(async () => {});

    expect(screen.queryByText(WAKING)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(screen.getByText(WAKING)).toBeInTheDocument();
  });

  it("add: says the server is waking up after 4 seconds", async () => {
    vi.useFakeTimers();
    routeFetch({ [CREATE]: () => new Promise<Response>(() => {}) });
    renderSection([]);
    submitNewStylist();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(screen.getByText(WAKING)).toBeInTheDocument();
  });
});

describe("StylistsSection dialogs: cannot be dismissed while sending", () => {
  it("assign: Escape does not close the dialog during a request", async () => {
    routeFetch({ [ASSIGN]: () => new Promise<Response>(() => {}) });
    renderSection([ADA_STYLIST]);
    openAssign();
    fireEvent.click(screen.getByRole("button", { name: "Save services" }));
    await screen.findByRole("button", { name: "Saving…" });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("add: Escape does not close the dialog during a request", async () => {
    routeFetch({ [CREATE]: () => new Promise<Response>(() => {}) });
    renderSection([]);
    submitNewStylist();
    await screen.findByRole("button", { name: /Adding|Saving/ });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("StylistsSection dialogs: reset", () => {
  it("cancelling the assign dialog drops unsaved ticks", async () => {
    routeFetch({});
    renderSection([ADA_STYLIST]);
    openAssign();
    fireEvent.click(screen.getByRole("checkbox", { name: /Braids/ }));
    expect(screen.getByRole("checkbox", { name: /Braids/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    openAssign();
    expect(screen.getByRole("checkbox", { name: /Braids/ })).toBeChecked();
  });
});
