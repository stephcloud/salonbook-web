import { render, screen, within } from "@testing-library/react";
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

import { SiteFooter } from "./SiteFooter";

const COLUMNS = ["For clients", "For salon owners", "Company"];

/** Renders the footer and returns each column's link hrefs by its label. */
async function columns() {
  render(await SiteFooter());
  return Object.fromEntries(
    COLUMNS.map((name) => [
      name,
      within(screen.getByRole("navigation", { name }))
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ]),
  );
}

describe("SiteFooter", () => {
  beforeEach(() => jar.clear());

  it("shows the brand, tagline and bottom bar", async () => {
    render(await SiteFooter());
    expect(screen.getByRole("link", { name: "SalonBook" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByText(
        "Book your salon appointment and pay the deposit online.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("© 2026 SalonBook")).toBeInTheDocument();
  });

  it("labels each column as its own navigation with a heading", async () => {
    render(await SiteFooter());
    for (const name of COLUMNS) {
      const nav = screen.getByRole("navigation", { name });
      expect(
        within(nav).getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }
  });

  it("gives guests sign in and register", async () => {
    expect(await columns()).toEqual({
      "For clients": ["/salons", "/login", "/register"],
      "For salon owners": ["/#pricing"],
      Company: ["/#features", "/#how-it-works", "/#faq"],
    });
  });

  it("gives a signed-in owner the dashboard, without sign in or register", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "owner");
    expect(await columns()).toEqual({
      "For clients": ["/salons"],
      "For salon owners": [
        "/dashboard",
        "/dashboard/availability",
        "/dashboard/bookings",
        "/#pricing",
      ],
      Company: ["/#features", "/#how-it-works", "/#faq"],
    });
  });

  it("gives a signed-in client their bookings, without sign in or register", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "client");
    expect(await columns()).toEqual({
      "For clients": ["/salons", "/bookings"],
      "For salon owners": ["/#pricing"],
      Company: ["/#features", "/#how-it-works", "/#faq"],
    });
  });

  it("treats an edited role cookie as a client", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "admin");
    const result = await columns();
    expect(result["For clients"]).toEqual(["/salons", "/bookings"]);
    expect(result["For salon owners"]).toEqual(["/#pricing"]);
  });

  it("treats a signed-in visitor without a role cookie as a client", async () => {
    jar.set("sb_token", "t");
    const result = await columns();
    expect(result["For clients"]).toEqual(["/salons", "/bookings"]);
    expect(result["For salon owners"]).toEqual(["/#pricing"]);
  });

  it("links to /register only once for guests", async () => {
    render(await SiteFooter());
    const register = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/register");
    expect(register).toHaveLength(1);
  });

  it("only links to landing sections that exist", async () => {
    const { HOME_ANCHORS } = await import("@/lib/landing-content");
    const known = new Set(HOME_ANCHORS.map(({ href }) => href));
    render(await SiteFooter());
    const anchors = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("/#"));
    expect(anchors.length).toBeGreaterThan(0);
    for (const href of anchors) expect(known).toContain(href);
  });

  it("never shows register or sign in to a signed-in visitor", async () => {
    for (const role of ["owner", "client", "admin"]) {
      jar.set("sb_token", "t");
      jar.set("sb_role", role);
      const { unmount } = render(await SiteFooter());
      expect(screen.queryByRole("link", { name: /register/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
      unmount();
    }
  });

  it("ignores a role cookie without a login", async () => {
    jar.set("sb_role", "owner");
    const result = await columns();
    expect(result["For clients"]).toEqual(["/salons", "/login", "/register"]);
    expect(result["For salon owners"]).toEqual(["/#pricing"]);
  });
});
