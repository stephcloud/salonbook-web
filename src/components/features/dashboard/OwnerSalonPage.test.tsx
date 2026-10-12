import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/dashboard/services",
}));

const requireUser = vi.fn();
const getMySalons = vi.fn();
vi.mock("@/lib/api-server", () => ({
  requireUser: (next: string) => requireUser(next),
  getMySalons: () => getMySalons(),
  loginRedirectUrl: (next: string) => `/login?next=${encodeURIComponent(next)}`,
}));

import { ApiError, type Salon } from "@/lib/api";
import { OwnerSalonPage } from "./OwnerSalonPage";

const SALON = { id: "salon-1", name: "Pink Studio" } as Salon;

async function renderPage(body = vi.fn(() => <p>the body</p>)) {
  const ui = await OwnerSalonPage({
    path: "/dashboard/services",
    title: "Services",
    description: "About services.",
    children: body,
  });
  render(ui);
  return body;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "o1", name: "Ada", role: "owner" });
  getMySalons.mockResolvedValue([SALON]);
});

describe("OwnerSalonPage", () => {
  it("returns to this page after signing in", async () => {
    await renderPage();
    expect(requireUser).toHaveBeenCalledWith("/dashboard/services");
  });

  it("sends a signed-out visitor to /login with next", async () => {
    requireUser.mockImplementation(async (next: string) => {
      redirect(`/login?next=${encodeURIComponent(next)}`);
    });
    await expect(renderPage()).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fdashboard%2Fservices",
    );
  });

  it("shows a client the owners-only notice and reads no owner data", async () => {
    requireUser.mockResolvedValue({ id: "c1", name: "Bola", role: "client" });
    const body = await renderPage();
    expect(screen.getByText(/for salon owners/i)).toBeInTheDocument();
    expect(getMySalons).not.toHaveBeenCalled();
    expect(body).not.toHaveBeenCalled();
  });

  it("treats a 403 from the API as the owners-only notice", async () => {
    getMySalons.mockRejectedValue(new ApiError(403, "forbidden"));
    await renderPage();
    expect(screen.getByText(/for salon owners/i)).toBeInTheDocument();
  });

  it("redirects to login when the token was rejected", async () => {
    getMySalons.mockRejectedValue(new ApiError(401, "no"));
    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("lets other errors reach the error page", async () => {
    getMySalons.mockRejectedValue(new ApiError(502, "down"));
    await expect(renderPage()).rejects.toThrow("down");
  });

  it("asks an owner with no salon to create one first", async () => {
    getMySalons.mockResolvedValue([]);
    const body = await renderPage();
    expect(screen.getByText(/Create your salon first/)).toBeInTheDocument();
    expect(body).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("renders the heading, the body for the first salon, and a way back", async () => {
    const body = await renderPage();
    expect(body).toHaveBeenCalledWith(SALON);
    expect(
      screen.getByRole("heading", { level: 1, name: "Services" }),
    ).toBeInTheDocument();
    expect(screen.getByText("the body")).toBeInTheDocument();
    expect(document.querySelector("main#main-content")).not.toBeNull();
  });
});
