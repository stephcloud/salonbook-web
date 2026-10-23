import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const jar = new Map<string, string>();
const read = vi.fn((name: string) => {
  const value = jar.get(name);
  return value === undefined ? undefined : { name, value };
});
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => read(name) }),
}));

function signIn(role?: string) {
  jar.set("sb_token", "token");
  if (role !== undefined) jar.set("sb_role", role);
}

import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathname = "/";
    jar.clear();
  });

  it("has a labelled main navigation with the logo and Salons link for everyone", async () => {
    render(await SiteHeader());
    expect(
      screen.getByRole("navigation", { name: "Main" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "SalonBook" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Salons" })).toHaveAttribute(
      "href",
      "/salons",
    );
  });

  it("sticks to the top above the page, on a near-opaque background", async () => {
    render(await SiteHeader());
    const header = screen.getByRole("banner");
    for (const name of [
      "sticky",
      "top-0",
      "z-40",
      "bg-card/95",
      "backdrop-blur-sm",
      "border-b",
    ]) {
      expect(header).toHaveClass(name);
    }
  });

  it("reads only the two cookies and calls no API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    signIn("owner");
    await SiteHeader();
    expect(read.mock.calls.map(([name]) => name).sort()).toEqual([
      "sb_role",
      "sb_token",
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("offers Sign in and Register, and no bookings link, when signed out", async () => {
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.queryByRole("link", { name: "My bookings" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("ignores a role cookie when there is no login cookie", async () => {
    jar.set("sb_role", "owner");
    render(await SiteHeader());
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows Dashboard, not My bookings, to a signed-in owner", async () => {
    signIn("owner");
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: "My bookings" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("shows My bookings, not Dashboard, to a signed-in client", async () => {
    signIn("client");
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "My bookings" })).toHaveAttribute(
      "href",
      "/bookings",
    );
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
  });

  it.each([[undefined], [""], ["admin"], ["Owner"]])(
    "falls back to My bookings when the role cookie is %j",
    async (role) => {
      signIn(role);
      render(await SiteHeader());
      expect(screen.getByRole("link", { name: "My bookings" })).toHaveAttribute(
        "href",
        "/bookings",
      );
      expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
    },
  );

  it("offers My bookings and Sign out, and no Sign in or Register, when signed in", async () => {
    signIn("client");
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "My bookings" })).toHaveAttribute(
      "href",
      "/bookings",
    );
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Register" })).toBeNull();
  });

  it('marks the exact page with aria-current="page"', async () => {
    signIn("client");
    pathname = "/bookings";
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "My bookings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Salons" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it('marks a page inside a section with aria-current="true", not "page"', async () => {
    signIn("client");
    pathname = "/bookings/abc/pay";
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "My bookings" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("marks the dashboard and its sub-pages for an owner", async () => {
    signIn("owner");
    pathname = "/dashboard";
    const { unmount } = render(await SiteHeader());
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    unmount();
    pathname = "/dashboard/services";
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("lists the links in a list inside the navigation", async () => {
    signIn("client");
    pathname = "/salons";
    render(await SiteHeader());
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
  });

  it("does not mark a link whose path only starts the same way", async () => {
    signIn("client");
    pathname = "/bookings-archive";
    render(await SiteHeader());
    expect(
      screen.getByRole("link", { name: "My bookings" }),
    ).not.toHaveAttribute("aria-current");
  });
});
