import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

import Home from "@/app/page";
import { HOME_ANCHORS } from "@/lib/landing-content";
import { SOCIAL_LINKS, SiteFooter } from "./SiteFooter";

const COLUMNS = ["For clients", "For salon owners", "Company"];
const PRICING: Link = ["Pricing", "/#pricing"];
const COMPANY: Link[] = [
  ["Features", "/#features"],
  ["How it works", "/#how-it-works"],
  ["FAQ", "/#faq"],
];

type Link = [label: string, href: string | null];

/** Renders the footer and returns each column's links as [label, href]. */
async function columns() {
  render(await SiteFooter());
  return Object.fromEntries(
    COLUMNS.map((name) => [
      name,
      within(screen.getByRole("navigation", { name }))
        .getAllByRole("link")
        .map((a): Link => [a.textContent ?? "", a.getAttribute("href")]),
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
      "For clients": [
        ["Find a salon", "/salons"],
        ["Sign in", "/login"],
        ["Register", "/register"],
      ],
      "For salon owners": [PRICING],
      Company: COMPANY,
    });
  });

  it("gives a signed-in owner the dashboard, without sign in or register", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "owner");
    expect(await columns()).toEqual({
      "For clients": [["Find a salon", "/salons"]],
      "For salon owners": [
        ["Dashboard", "/dashboard"],
        ["Weekly hours", "/dashboard/availability"],
        ["Bookings", "/dashboard/bookings"],
        PRICING,
      ],
      Company: COMPANY,
    });
  });

  it("gives a signed-in client their bookings, without sign in or register", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "client");
    expect(await columns()).toEqual({
      "For clients": [
        ["Find a salon", "/salons"],
        ["My bookings", "/bookings"],
      ],
      "For salon owners": [PRICING],
      Company: COMPANY,
    });
  });

  it("treats an edited role cookie as a client", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "admin");
    const result = await columns();
    expect(result["For clients"]).toContainEqual(["My bookings", "/bookings"]);
    expect(result["For salon owners"]).toEqual([PRICING]);
  });

  it("treats a signed-in visitor without a role cookie as a client", async () => {
    jar.set("sb_token", "t");
    const result = await columns();
    expect(result["For clients"]).toContainEqual(["My bookings", "/bookings"]);
    expect(result["For salon owners"]).toEqual([PRICING]);
  });

  it("links to /register only once for guests", async () => {
    render(await SiteFooter());
    const register = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/register");
    expect(register).toHaveLength(1);
  });

  it("only links to sections that exist on the landing page", async () => {
    render(await SiteFooter());
    const anchors = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("/#"));
    cleanup();

    const { container } = render(await Home());
    expect(anchors.length).toBeGreaterThan(0);
    for (const href of anchors) {
      expect(container.querySelector(href.slice(1))).not.toBeNull();
    }
  });

  describe("without a pricing anchor", () => {
    const saved = [...HOME_ANCHORS];
    beforeEach(() => {
      HOME_ANCHORS.splice(
        HOME_ANCHORS.findIndex(({ href }) => href === "/#pricing"),
        1,
      );
    });
    afterEach(() => HOME_ANCHORS.splice(0, HOME_ANCHORS.length, ...saved));

    it("leaves out a column that would have no links", async () => {
      render(await SiteFooter());
      expect(
        screen.queryByRole("navigation", { name: "For salon owners" }),
      ).toBeNull();
      expect(
        screen.queryByRole("heading", { name: "For salon owners" }),
      ).toBeNull();
      expect(
        screen.getByRole("navigation", { name: "For clients" }),
      ).toBeInTheDocument();
    });

    it("keeps the column for an owner, who still has dashboard links", async () => {
      jar.set("sb_token", "t");
      jar.set("sb_role", "owner");
      expect((await columns())["For salon owners"]).toEqual([
        ["Dashboard", "/dashboard"],
        ["Weekly hours", "/dashboard/availability"],
        ["Bookings", "/dashboard/bookings"],
      ]);
    });
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
    expect(result["For clients"]).toEqual([
      ["Find a salon", "/salons"],
      ["Sign in", "/login"],
      ["Register", "/register"],
    ]);
    expect(result["For salon owners"]).toEqual([PRICING]);
  });

  describe("social links", () => {
    const saved = SOCIAL_LINKS.map((link) => ({ ...link }));
    // Fresh copies, so setSocial never edits the saved originals.
    afterEach(() =>
      SOCIAL_LINKS.splice(
        0,
        SOCIAL_LINKS.length,
        ...saved.map((link) => ({ ...link })),
      ),
    );

    function setSocial(hrefs: Record<string, string>) {
      for (const link of SOCIAL_LINKS) link.href = hrefs[link.label] ?? "";
    }

    it("hides the column while every entry is a placeholder", async () => {
      setSocial({ Facebook: "#", LinkedIn: "#", Instagram: "#" });
      render(await SiteFooter());
      expect(
        screen.queryByRole("navigation", { name: "Find us on social" }),
      ).toBeNull();
      expect(
        screen.queryByRole("heading", { name: "Find us on social" }),
      ).toBeNull();
    });

    it("hides the column when no entry has a real https URL", async () => {
      setSocial({
        Facebook: "",
        LinkedIn: "/linkedin",
        Instagram: "http://example.com/salonbook",
      });
      render(await SiteFooter());
      expect(
        screen.queryByRole("navigation", { name: "Find us on social" }),
      ).toBeNull();
    });

    it("skips script, protocol-relative, bare and host-less URLs", async () => {
      setSocial({
        Facebook: "javascript:alert(1)",
        LinkedIn: "//example.com/salonbook",
        Instagram: "https://localhost/salonbook",
      });
      render(await SiteFooter());
      expect(
        screen.queryByRole("navigation", { name: "Find us on social" }),
      ).toBeNull();
    });

    it("shows only the entries with a real URL, opening in a new tab", async () => {
      setSocial({
        Facebook: "#",
        LinkedIn: "https://example.com/salonbook-linkedin",
        Instagram: "",
      });
      render(await SiteFooter());
      const nav = screen.getByRole("navigation", { name: "Find us on social" });
      expect(
        within(nav).getByRole("heading", {
          level: 2,
          name: "Find us on social",
        }),
      ).toBeInTheDocument();
      const links = within(nav).getAllByRole("link");
      expect(links).toHaveLength(1);
      const [linkedIn] = links;
      expect(linkedIn).toHaveAccessibleName(
        "SalonBook on LinkedIn (opens in a new tab)",
      );
      expect(linkedIn).toHaveTextContent("LinkedIn");
      expect(linkedIn).toHaveAttribute(
        "href",
        "https://example.com/salonbook-linkedin",
      );
      expect(linkedIn).toHaveAttribute("target", "_blank");
      expect(linkedIn).toHaveAttribute("rel", "noopener noreferrer");
      expect(linkedIn.querySelector("svg")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });

    it("shows every entry once all have real URLs", async () => {
      setSocial({
        Facebook: "https://example.com/fb",
        LinkedIn: "https://example.com/li",
        Instagram: "https://example.com/ig",
      });
      render(await SiteFooter());
      const nav = screen.getByRole("navigation", { name: "Find us on social" });
      expect(
        within(nav)
          .getAllByRole("link")
          .map((a) => a.getAttribute("aria-label")),
      ).toEqual([
        "SalonBook on Facebook (opens in a new tab)",
        "SalonBook on LinkedIn (opens in a new tab)",
        "SalonBook on Instagram (opens in a new tab)",
      ]);
    });
  });
});
