import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
// The results are an async server component; its own test covers the fetching.
vi.mock("@/components/features/salons/SalonResults", () => ({
  SalonResults: ({ search, page }: { search: unknown; page: number }) => (
    <p data-testid="results">{`${JSON.stringify(search)} page ${page}`}</p>
  ),
}));

// Suggestions are optional: rendering nothing must leave the page working.
vi.mock("@/components/features/salons/SalonNameSuggestions", () => ({
  SalonNameSuggestions: () => null,
}));

import SalonsPage from "./page";

function searchParams(page?: string, q?: string, area?: string) {
  return Promise.resolve({
    ...(page === undefined ? {} : { page }),
    ...(q === undefined ? {} : { q }),
    ...(area === undefined ? {} : { area }),
  });
}

async function renderPage(page?: string, q?: string, area?: string) {
  render(await SalonsPage({ searchParams: searchParams(page, q, area) }));
}

const NONE = `{"name":"","area":null}`;

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
      `${NONE} page ${expected}`,
    );
  });

  it("shows the heading and the search box inside the main landmark", async () => {
    await renderPage();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", { level: 1, name: "Salons" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Salon name")).toHaveValue("");
    expect(screen.getByLabelText("Location")).toHaveValue("");
  });

  it("passes the trimmed ?q= and ?area= on and keeps them in the fields", async () => {
    await renderPage("2", "  pink ", " Ikeja  ");
    expect(screen.getByTestId("results")).toHaveTextContent(
      `{"name":"pink","area":"Ikeja"} page 2`,
    );
    expect(screen.getByLabelText("Salon name")).toHaveValue("pink");
    expect(screen.getByLabelText("Location")).toHaveValue("Ikeja");
  });

  it("keeps an old ?q= link working as a name-or-area search", async () => {
    await renderPage(undefined, "Lagos");
    expect(screen.getByTestId("results")).toHaveTextContent(
      `{"name":"Lagos","area":null} page 1`,
    );
  });

  it("still shows the search box and results without suggestions", async () => {
    await renderPage();
    expect(document.querySelector("datalist")).toBeNull();
    expect(screen.getByLabelText("Salon name")).toBeInTheDocument();
    expect(screen.getByTestId("results")).toBeInTheDocument();
  });

  it("offers Clear search only while a search is set", async () => {
    await renderPage();
    expect(screen.queryByRole("link", { name: "Clear search" })).toBeNull();
    cleanup();
    await renderPage(undefined, undefined, "Ikeja");
    expect(screen.getByRole("link", { name: "Clear search" })).toHaveAttribute(
      "href",
      "/salons",
    );
  });

  it("treats a blank ?q= as no search", async () => {
    await renderPage(undefined, "   ", " ");
    expect(screen.getByTestId("results")).toHaveTextContent(
      `{"name":"","area":""} page 1`,
    );
  });
});
