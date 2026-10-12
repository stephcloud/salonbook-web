import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

const getSalons = vi.fn();
const searchSalons = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getSalons: (page: number) => getSalons(page),
  searchSalons: (q: string, page: number) => searchSalons(q, page),
}));

import { SalonResults } from "./SalonResults";
import { SalonResultsFallback } from "./SalonResultsFallback";

describe("SalonResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSalons.mockResolvedValue([]);
    searchSalons.mockResolvedValue({
      salons: [],
      hasNext: false,
      truncated: false,
    });
  });

  it("lists the page without searching when there is no term", async () => {
    render(await SalonResults({ query: "", page: 3 }));
    expect(getSalons).toHaveBeenCalledWith(3);
    expect(searchSalons).not.toHaveBeenCalled();
    expect(screen.getByText("No more salons")).toBeInTheDocument();
  });

  it("shows 'No salons yet' for an empty first page", async () => {
    render(await SalonResults({ query: "", page: 1 }));
    expect(screen.getByText("No salons yet")).toBeInTheDocument();
  });

  it("searches when there is a term", async () => {
    render(await SalonResults({ query: "pink", page: 2 }));
    expect(searchSalons).toHaveBeenCalledWith("pink", 2);
    expect(getSalons).not.toHaveBeenCalled();
  });

  it("explains an empty search, in the title and to screen readers", async () => {
    render(await SalonResults({ query: "zzz", page: 1 }));
    expect(screen.getAllByText("No salons match 'zzz'")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent(
      "No salons match 'zzz'",
    );
    expect(
      screen.getByRole("link", { name: "Show all salons" }),
    ).toHaveAttribute("href", "/salons");
  });

  it("tells the reader when only the first 500 salons were searched", async () => {
    searchSalons.mockResolvedValue({
      salons: [],
      hasNext: false,
      truncated: true,
    });
    render(await SalonResults({ query: "zzz", page: 1 }));
    expect(screen.getByText(/first 500 salons/)).toBeInTheDocument();
  });
});

describe("SalonResultsFallback", () => {
  it("says it is searching, or loading, in a status region", () => {
    const { rerender } = render(<SalonResultsFallback searching />);
    expect(screen.getByRole("status")).toHaveTextContent("Searching…");
    rerender(<SalonResultsFallback searching={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading salons…");
  });

  it("carries the waking-up note, hidden until a delay passes", () => {
    render(<SalonResultsFallback searching />);
    const note = screen.getByText(/Waking up the server/);
    expect(note).toHaveClass("invisible");
    expect(note.className).toContain("reveal-late");
  });
});
