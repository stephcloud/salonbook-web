import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/dashboard",
}));

const requireUser = vi.fn();
const getMySalons = vi.fn();
vi.mock("@/lib/api-server", () => ({
  requireUser: (next: string) => requireUser(next),
  getMySalons: () => getMySalons(),
  loginRedirectUrl: (next: string) => `/login?next=${encodeURIComponent(next)}`,
}));

const loadChecklistInput = vi.fn();
vi.mock("@/lib/dashboard-data", () => ({
  loadChecklistInput: (salon: unknown) => loadChecklistInput(salon),
}));

import { ApiError, type OwnerSalon } from "@/lib/api";
import DashboardPage from "./page";

const SALON: OwnerSalon = {
  id: "11111111-1111-4111-8111-111111111111",
  owner_id: "22222222-2222-4222-8222-222222222222",
  name: "Pink Studio",
  address: "12 Admiralty Way, Lekki",
  phone: "08012345678",
  image_url: null,
  cancellation_hours: 24,
  deposit_amount: 500000,
  created_at: "2026-10-01T10:00:00Z",
  status: "approved",
};

const WORKING = {
  stylist_id: "st",
  rules: [
    {
      id: "r",
      kind: "working" as const,
      weekday: 1,
      start_time: "09:00:00",
      end_time: "17:00:00",
      off_date: null,
    },
  ],
};

function checklistInput(overrides: Record<string, unknown> = {}) {
  return {
    salon: SALON,
    services: [],
    stylists: [],
    availability: { read: [], unchecked: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "o1", name: "Ada", role: "owner" });
  getMySalons.mockResolvedValue([SALON]);
  loadChecklistInput.mockResolvedValue(checklistInput());
});

describe("DashboardPage: who can see it", () => {
  it("requires sign-in and returns to /dashboard", async () => {
    await DashboardPage();
    expect(requireUser).toHaveBeenCalledWith("/dashboard");
  });

  it("sends a signed-out visitor to /login?next=/dashboard", async () => {
    requireUser.mockImplementation(async (next: string) => {
      redirect(`/login?next=${encodeURIComponent(next)}`);
    });
    await expect(DashboardPage()).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fdashboard",
    );
    expect(getMySalons).not.toHaveBeenCalled();
  });

  it("tells a client this area is for salon owners and reads no owner data", async () => {
    requireUser.mockResolvedValue({ id: "c1", name: "Bola", role: "client" });

    render(await DashboardPage());

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This area is for salon owners",
      }),
    ).toBeInTheDocument();
    expect(getMySalons).not.toHaveBeenCalled();
    expect(loadChecklistInput).not.toHaveBeenCalled();
  });

  it("shows the same notice if the API refuses the owner's salons with 403", async () => {
    getMySalons.mockRejectedValue(new ApiError(403, "Owners only"));
    render(await DashboardPage());
    expect(
      screen.getByRole("heading", { name: "This area is for salon owners" }),
    ).toBeInTheDocument();
  });

  it("sends an owner whose session just ended (401) to sign in", async () => {
    getMySalons.mockRejectedValue(new ApiError(401, "Please sign in again."));
    await expect(DashboardPage()).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fdashboard",
    );
  });

  it("lets other failures reach the error page, which offers a retry", async () => {
    getMySalons.mockRejectedValue(
      new ApiError(502, "The server is not responding."),
    );
    await expect(DashboardPage()).rejects.toThrow(
      "The server is not responding.",
    );
  });
});

describe("DashboardPage: an owner with no salon", () => {
  beforeEach(() => getMySalons.mockResolvedValue([]));

  it("shows the create form and no checklist", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", { level: 1, name: "Create your salon" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Salon name")).toBeInTheDocument();
    expect(screen.getByLabelText("Deposit (₦)")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create salon" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Set up your salon")).toBeNull();
    expect(loadChecklistInput).not.toHaveBeenCalled();
  });
});

describe("DashboardPage: an owner with a salon", () => {
  it("shows the salon, an Edit button and the checklist", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Pink Studio" }),
    ).toBeInTheDocument();
    expect(screen.getByText("12 Admiralty Way, Lekki")).toBeInTheDocument();
    expect(screen.getByText("₦5,000")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit salon details" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Set up your salon" }),
    ).toBeInTheDocument();
    expect(loadChecklistInput).toHaveBeenCalledWith(SALON);
    // The create form is not shown when a salon exists.
    expect(screen.queryByRole("button", { name: "Create salon" })).toBeNull();
  });

  it("marks checklist steps from the real data it loaded", async () => {
    loadChecklistInput.mockResolvedValue(
      checklistInput({
        services: [{ id: "s1" }],
        stylists: [{ id: "st", name: "Ada" }],
        availability: { read: [WORKING], unchecked: 0 },
      }),
    );

    render(await DashboardPage());

    expect(screen.getByText("5 of 5 set up")).toBeInTheDocument();
    const items = within(
      screen.getByRole("region", { name: /set up your salon/i }),
    ).getAllByRole("listitem");
    expect(items[5]).toHaveTextContent("Ready to share.");
  });

  it("shows a pending salon's status, the approval step and the link note", async () => {
    const pending = { ...SALON, status: "pending" as const };
    getMySalons.mockResolvedValue([pending]);
    loadChecklistInput.mockResolvedValue(checklistInput({ salon: pending }));

    render(await DashboardPage());

    const overview = screen.getByRole("region", { name: "Pink Studio" });
    expect(
      within(overview).getByText("Waiting for approval"),
    ).toBeInTheDocument();
    const items = within(
      screen.getByRole("region", { name: /set up your salon/i }),
    ).getAllByRole("listitem");
    expect(items[4]).toHaveTextContent("Waiting for approval");
    expect(items[5]).toHaveTextContent(
      /will see “not found” until your salon is approved/,
    );
  });

  it("shows the public link, Copy and Preview for the salon", async () => {
    render(await DashboardPage());
    expect(screen.getByText(`/salons/${SALON.id}`)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Preview as a customer" }),
    ).toHaveAttribute("href", `/salons/${SALON.id}`);
    expect(
      screen.getByRole("button", { name: "Copy salon link" }),
    ).toBeInTheDocument();
  });

  it("says how many salons there are when there are several, and manages the first", async () => {
    getMySalons.mockResolvedValue([
      SALON,
      { ...SALON, id: "other", name: "Second" },
    ]);

    render(await DashboardPage());

    expect(
      screen.getByText("You have 2 salons. This page manages Pink Studio."),
    ).toBeInTheDocument();
    expect(loadChecklistInput).toHaveBeenCalledWith(SALON);
  });

  it("does not mention several salons when there is one", async () => {
    render(await DashboardPage());
    expect(screen.queryByText(/You have \d+ salons/)).toBeNull();
  });

  it("lets a failed services or stylists read reach the error page", async () => {
    loadChecklistInput.mockRejectedValue(
      new Error("The server is not responding."),
    );
    await expect(DashboardPage()).rejects.toThrow("not responding");
  });
});
