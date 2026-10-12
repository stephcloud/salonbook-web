import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
// The results are an async server component; its own test covers the fetching.
vi.mock("@/components/features/salons/SalonResults", () => ({
  SalonResults: ({ query, page }: { query: string; page: number }) => (
    <p data-testid="results">{`${JSON.stringify(query)} page ${page}`}</p>
  ),
}));

// Suggestions are optional: rendering nothing must leave the page working.
vi.mock("@/components/features/salons/SalonNameSuggestions", () => ({
  SalonNameSuggestions: () => null,
}));

import SalonsPage from "./page";

function searchParams(page?: string, q?: string) {
  return Promise.resolve({
    ...(page === undefined ? {} : { page }),
    ...(q === undefined ? {} : { q }),
  });
}

async function renderPage(page?: string, q?: string) {
  render(await SalonsPage({ searchParams: searchParams(page, q) }));
}

describe("SalonsPage", () => {
  it.each([
    [undefined, 1],
    ["3", 3],
    ["abc", 1],
    ["0", 1],
    ["-2", 1],
    ["9999", 500],
  ])("reads ?page=%s as page %i", async (raw, expected) => {
    await renderPage(raw);
    expect(screen.getByTestId("results")).toHaveTextContent(
      `"" page ${expected}`,
    );
  });

  it("shows the heading and the search box inside the main landmark", async () => {
    await renderPage();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", { level: 1, name: "Salons" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search salons by name")).toHaveValue("");
  });

  it("passes the trimmed ?q= on and keeps it in the box", async () => {
    await renderPage("2", "  pink ");
    expect(screen.getByTestId("results")).toHaveTextContent('"pink" page 2');
    expect(screen.getByLabelText("Search salons by name")).toHaveValue("pink");
  });

  it("still shows the search box and results without suggestions", async () => {
    await renderPage();
    expect(document.querySelector("datalist")).toBeNull();
    expect(screen.getByLabelText("Search salons by name")).toBeInTheDocument();
    expect(screen.getByTestId("results")).toBeInTheDocument();
  });

  it("treats a blank ?q= as no search", async () => {
    await renderPage(undefined, "   ");
    expect(screen.getByTestId("results")).toHaveTextContent('"" page 1');
  });
});
