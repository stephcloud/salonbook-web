import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

const getSalons = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getSalons: (page: number) => getSalons(page),
}));

import SalonsPage from "./page";

function searchParams(page?: string) {
  return Promise.resolve(page === undefined ? {} : { page });
}

describe("SalonsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSalons.mockResolvedValue([]);
  });

  it.each([
    [undefined, 1],
    ["3", 3],
    ["abc", 1],
    ["0", 1],
    ["-2", 1],
    ["9999", 500],
  ])("reads ?page=%s as page %i", async (raw, expected) => {
    await SalonsPage({ searchParams: searchParams(raw) });
    expect(getSalons).toHaveBeenCalledWith(expected);
  });

  it("shows the empty state inside the main landmark", async () => {
    render(await SalonsPage({ searchParams: searchParams() }));
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", { level: 1, name: "Salons" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No salons yet")).toBeInTheDocument();
  });
});
