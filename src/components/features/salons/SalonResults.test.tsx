import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

const getSalons = vi.fn();
const searchSalons = vi.fn();
const getSalonAreas = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getSalons: (page: number) => getSalons(page),
  searchSalons: (search: unknown, page: number) => searchSalons(search, page),
  getSalonAreas: () => getSalonAreas(),
}));

const NONE = { name: "", area: "" };

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
    getSalonAreas.mockResolvedValue(["Lagos", "GRA"]);
  });

  it("lists the page without searching when there is no term", async () => {
    render(await SalonResults({ search: NONE, page: 3 }));
    expect(getSalons).toHaveBeenCalledWith(3);
    expect(searchSalons).not.toHaveBeenCalled();
    expect(screen.getByText("No more salons")).toBeInTheDocument();
  });

  it("shows 'No salons yet' for an empty first page", async () => {
    render(await SalonResults({ search: NONE, page: 1 }));
    expect(screen.getByText("No salons yet")).toBeInTheDocument();
  });

  it("searches when there is a term", async () => {
    const search = { name: "pink", area: "yaba" };
    render(await SalonResults({ search, page: 2 }));
    expect(searchSalons).toHaveBeenCalledWith(search, 2);
    expect(getSalons).not.toHaveBeenCalled();
  });

  it("names the location in an empty search and offers real areas", async () => {
    render(await SalonResults({ search: { name: "", area: "Wuse" }, page: 1 }));
    expect(screen.getByText("No salons in “Wuse” yet")).toBeInTheDocument();
    expect(screen.getByText("Try one of these areas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lagos" })).toHaveAttribute(
      "href",
      "/salons?area=Lagos",
    );
    expect(screen.getByRole("link", { name: "GRA" })).toHaveAttribute(
      "href",
      "/salons?area=GRA",
    );
    expect(screen.getByRole("link", { name: "Clear search" })).toHaveAttribute(
      "href",
      "/salons",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "No salons match your search.",
    );
  });

  it("says the search found nothing when only the name was typed", async () => {
    render(await SalonResults({ search: { name: "zzz", area: "" }, page: 1 }));
    expect(screen.getByText("No salons match your search")).toBeInTheDocument();
  });

  it("does not claim the location is empty when a name was typed too", async () => {
    render(
      await SalonResults({ search: { name: "Glow", area: "Wuse" }, page: 1 }),
    );
    expect(screen.getByText("No salons match your search")).toBeInTheDocument();
    expect(screen.queryByText(/No salons in/)).toBeNull();
  });

  it("leaves out the area just searched and still offers Clear search", async () => {
    getSalonAreas.mockResolvedValue(["Lagos"]);
    render(
      await SalonResults({ search: { name: "x", area: " lagos " }, page: 1 }),
    );
    expect(screen.queryByText("Try one of these areas")).toBeNull();
    expect(screen.queryByRole("link", { name: "Lagos" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Clear search" }),
    ).toBeInTheDocument();
  });

  it("keeps the empty state when the areas cannot be fetched", async () => {
    getSalonAreas.mockRejectedValue(new Error("down"));
    render(await SalonResults({ search: { name: "", area: "Wuse" }, page: 1 }));
    expect(screen.queryByRole("list")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Clear search" }),
    ).toBeInTheDocument();
  });

  it("does not fetch areas when not searching", async () => {
    render(await SalonResults({ search: NONE, page: 1 }));
    expect(getSalonAreas).not.toHaveBeenCalled();
  });

  it("tells the reader when only the first 500 salons were searched", async () => {
    searchSalons.mockResolvedValue({
      salons: [],
      hasNext: false,
      truncated: true,
    });
    render(await SalonResults({ search: { name: "zzz", area: "" }, page: 1 }));
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

  it("shows placeholder cards shaped like the salon cards", () => {
    render(<SalonResultsFallback searching={false} />);
    expect(screen.getByTestId("salon-card-skeletons")).toBeInTheDocument();
  });
});
