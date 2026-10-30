import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const pathname = "/dashboard/bookings";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { DashboardNav } from "./DashboardNav";

describe("DashboardNav", () => {
  it("links the owner pages and marks only the current one", () => {
    render(<DashboardNav />);
    const bookings = screen.getByRole("link", { name: "Bookings" });
    expect(bookings).toHaveAttribute("href", "/dashboard/bookings");
    expect(bookings).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });
  describe("on a narrow screen", () => {
    afterEach(() => vi.restoreAllMocks());

    it("scrolls the row so the current link sits in the middle", () => {
      // jsdom has no layout: the row is 300px wide, Bookings is 100px wide at 400px.
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
        300,
      );
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(
        100,
      );
      vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockReturnValue(400);

      render(<DashboardNav />);

      expect(screen.getByRole("list").scrollLeft).toBe(300);
    });
  });
});
