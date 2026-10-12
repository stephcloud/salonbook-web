import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
const LIST_STYLISTS = `GET /api/proxy/salons/${SALON}/stylists`;
const LIST_SERVICES = `GET /api/proxy/salons/${SALON}/services`;
const ASSIGN = `PUT /api/proxy/stylists/${ADA}/services`;

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
  service_ids: [],
};

function renderSection(services: Service[], stylists: Stylist[]) {
  return render(
    <QueryProvider>
      <StylistsSection
        salonId={SALON}
        initialServices={services}
        initialStylists={stylists}
      />
    </QueryProvider>,
  );
}

function openAddAndName() {
  fireEvent.click(screen.getByRole("button", { name: "Add a stylist" }));
  fireEvent.change(screen.getByLabelText("Stylist name"), {
    target: { value: "Ada" },
  });
}

beforeEach(() => refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("StylistsSection: timeouts, retry view and empty states", () => {
  it("after a timeout says the stylist may exist and re-reads the list instead of inviting a blind retry", async () => {
    const api = routeFetch({
      [CREATE]: () => json({ error: "slow" }, 504),
      [LIST_STYLISTS]: () => json([ADA_STYLIST]),
      [LIST_SERVICES]: () => json(SERVICES),
    });
    renderSection(SERVICES, []);
    openAddAndName();
    fireEvent.click(screen.getByRole("button", { name: "Add stylist" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /may have been added/,
    );
    await waitFor(() => expect(api.count(LIST_STYLISTS)).toBeGreaterThan(0));
    expect(refresh).toHaveBeenCalled();
    expect(api.count(CREATE)).toBe(1);
  });

  it("shows the stylist's name in the retry view after a partial failure", async () => {
    routeFetch({
      [CREATE]: () => json({ id: ADA, name: "Ada", image_url: null }, 201),
      [ASSIGN]: () => json({ detail: "boom" }, 500),
      [LIST_STYLISTS]: () => json([ADA_STYLIST]),
      [LIST_SERVICES]: () => json(SERVICES),
    });
    renderSection(SERVICES, []);
    openAddAndName();
    fireEvent.click(screen.getByRole("checkbox", { name: /^Braids/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add stylist" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Stylist:")).toBeInTheDocument();
  });

  it("offers a way to add services from the empty state when there are none", () => {
    renderSection([], []);
    expect(
      screen.getAllByRole("link", { name: "Go to services" }).length,
    ).toBeGreaterThan(0);
  });

  it("refreshes once when a stylist with no services is added", async () => {
    const api = routeFetch({
      [CREATE]: () => json({ id: ADA, name: "Ada", image_url: null }, 201),
      [LIST_STYLISTS]: () => json([ADA_STYLIST]),
      [LIST_SERVICES]: () => json(SERVICES),
    });
    renderSection(SERVICES, []);
    openAddAndName();
    fireEvent.click(screen.getByRole("button", { name: "Add stylist" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(api.count(LIST_STYLISTS)).toBe(1);
  });
});
