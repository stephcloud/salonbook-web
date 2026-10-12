import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

import Home, { metadata } from "./page";

async function show() {
  render(await Home());
}

describe("landing page", () => {
  beforeEach(() => jar.clear());

  it("has one h1, the skip-link target and the section headings", async () => {
    await show();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    for (const name of [
      "Booking a salon should not be this hard",
      "Who SalonBook is for",
      "How it works",
      "Pricing",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }
  });

  it("names the problem and gives three steps to clients and owners", async () => {
    await show();
    expect(screen.getByText("No-shows")).toBeInTheDocument();
    expect(screen.getByText("No deposits")).toBeInTheDocument();
    const lists = document.querySelectorAll("ol");
    expect(lists).toHaveLength(2);
    lists.forEach((list) =>
      expect(list.querySelectorAll("li")).toHaveLength(3),
    );
  });

  it("adds a decorative hero tile that assistive tech skips and has no text", async () => {
    await show();
    const tile = screen.getByTestId("hero-tile");
    expect(tile).toHaveAttribute("aria-hidden", "true");
    expect(tile).toBeEmptyDOMElement();
    expect(tile).toHaveClass("hidden", "lg:block");
  });

  it("shows the exact pricing placeholder", async () => {
    await show();
    expect(
      screen.getByText("Free while we launch, simple monthly plan later"),
    ).toBeInTheDocument();
  });

  it("offers Find a salon and Register your salon to visitors", async () => {
    await show();
    expect(screen.getByRole("link", { name: "Find a salon" })).toHaveAttribute(
      "href",
      "/salons",
    );
    expect(
      screen.getByRole("link", { name: "Register your salon" }),
    ).toHaveAttribute("href", "/register");
  });

  it("sends a signed-in owner to the dashboard instead of register", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "owner");
    await show();
    expect(
      screen.getByRole("link", { name: "Go to your dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
    expect(
      screen.queryByRole("link", { name: "Register your salon" }),
    ).toBeNull();
  });

  it("shows a signed-in client only Find a salon", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "client");
    await show();
    expect(
      screen.getByRole("link", { name: "Find a salon" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Register your salon" }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Go to your dashboard" }),
    ).toBeNull();
  });

  it("sets a title and description for the home page", () => {
    expect(metadata.title).toBe(
      "SalonBook · Book your salon appointment online",
    );
    expect(metadata.description).toBeTruthy();
  });
});
