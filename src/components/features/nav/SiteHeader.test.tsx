import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const has = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ has: (name: string) => has(name) }),
}));

import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathname = "/";
    has.mockReturnValue(false);
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

  it("checks only that the login cookie exists", async () => {
    await SiteHeader();
    expect(has).toHaveBeenCalledWith("sb_token");
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
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("offers My bookings and Sign out, and no Sign in or Register, when signed in", async () => {
    has.mockReturnValue(true);
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

  it("marks the page you are on, including pages under it", async () => {
    has.mockReturnValue(true);
    pathname = "/bookings/abc/pay";
    render(await SiteHeader());
    expect(screen.getByRole("link", { name: "My bookings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Salons" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("does not mark a link whose path only starts the same way", async () => {
    has.mockReturnValue(true);
    pathname = "/bookings-archive";
    render(await SiteHeader());
    expect(
      screen.getByRole("link", { name: "My bookings" }),
    ).not.toHaveAttribute("aria-current");
  });
});
