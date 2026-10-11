import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: vi.fn(),
}));

const requireUser = vi.fn();
vi.mock("@/lib/api-server", () => ({
  requireUser: (next: string) => requireUser(next),
}));

const loadSalonBundle = vi.fn();
vi.mock("@/lib/salon-bundle", () => ({
  loadSalonBundle: (id: string) => loadSalonBundle(id),
}));

import BookPage from "./page";

const SALON_ID = "11111111-1111-4111-8111-111111111111";
const BRAIDS = "22222222-2222-4222-8222-222222222222";

const bundle = {
  salon: {
    id: SALON_ID,
    owner_id: "owner",
    name: "Pink Studio",
    address: "12 Admiralty Way, Lekki",
    phone: "08012345678",
    image_url: null,
    cancellation_hours: 24,
    deposit_amount: 500000,
    created_at: "2026-10-01T10:00:00Z",
  },
  services: [
    {
      id: BRAIDS,
      salon_id: SALON_ID,
      name: "Box braids",
      duration_minutes: 90,
      price_type: "fixed",
      price: 1500000,
      created_at: "2026-10-01T10:00:00Z",
    },
  ],
  stylists: [
    { id: "s1", name: "Amara", image_url: null, service_ids: [BRAIDS] },
  ],
};

function props(search: Record<string, string | string[]> = {}) {
  return {
    params: Promise.resolve({ salonId: SALON_ID }),
    searchParams: Promise.resolve(search),
  } as unknown as Parameters<typeof BookPage>[0];
}

describe("BookPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "u1", role: "client", name: "Ada" });
    loadSalonBundle.mockResolvedValue(bundle);
  });

  it("asks to sign in and comes back to the same path", async () => {
    await BookPage(props());
    expect(requireUser).toHaveBeenCalledWith(`/book/${SALON_ID}`);
  });

  it("keeps ?service= in the path it returns to after login", async () => {
    await BookPage(props({ service: BRAIDS }));
    expect(requireUser).toHaveBeenCalledWith(
      `/book/${SALON_ID}?service=${BRAIDS}`,
    );
  });

  it("does not load the salon for a signed-out visitor (requireUser redirects)", async () => {
    requireUser.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect(BookPage(props())).rejects.toThrow("NEXT_REDIRECT");
    expect(loadSalonBundle).not.toHaveBeenCalled();
  });

  it("tells owners that booking is for clients, without loading the salon", async () => {
    requireUser.mockResolvedValue({ id: "u2", role: "owner", name: "Bola" });
    render(await BookPage(props()));
    expect(
      screen.getByRole("heading", { name: "Booking is for clients" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(loadSalonBundle).not.toHaveBeenCalled();
  });

  it("starts at the service list when there is no ?service=", async () => {
    render(await BookPage(props()));
    expect(
      screen.getByRole("heading", { level: 1, name: "Book at Pink Studio" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Choose a service" }),
    ).toBeInTheDocument();
  });

  it("starts at the stylist step for a valid ?service=", async () => {
    render(await BookPage(props({ service: BRAIDS })));
    expect(
      screen.getByRole("group", { name: "Choose a stylist" }),
    ).toBeInTheDocument();
  });

  it("ignores an unknown ?service= and shows the list", async () => {
    render(await BookPage(props({ service: "not-a-service" })));
    expect(
      screen.getByRole("group", { name: "Choose a service" }),
    ).toBeInTheDocument();
  });
});
