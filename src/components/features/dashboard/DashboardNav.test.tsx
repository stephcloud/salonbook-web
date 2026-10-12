import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
});
