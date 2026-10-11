import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

const requireUser = vi.fn();
const getMyBookings = vi.fn();
vi.mock("@/lib/api-server", () => ({
  requireUser: (next: string) => requireUser(next),
  getMyBookings: () => getMyBookings(),
  loginRedirectUrl: (next: string) => `/login?next=${encodeURIComponent(next)}`,
}));

import { ApiError } from "@/lib/api";
import BookingsPage from "./page";

describe("BookingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "c1", role: "client" });
    getMyBookings.mockResolvedValue([]);
  });

  it("requires sign-in and returns to /bookings", async () => {
    await BookingsPage();
    expect(requireUser).toHaveBeenCalledWith("/bookings");
  });

  it("shows the empty state inside the main landmark", async () => {
    render(await BookingsPage());
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", { level: 1, name: "My bookings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No bookings yet")).toBeInTheDocument();
  });

  it("tells owners it is for clients, without reading bookings", async () => {
    requireUser.mockResolvedValue({ id: "o1", role: "owner" });
    render(await BookingsPage());
    expect(
      screen.getByRole("heading", { name: "Booking is for clients" }),
    ).toBeInTheDocument();
    expect(getMyBookings).not.toHaveBeenCalled();
  });

  it("sends a 401 to login with this page as next", async () => {
    getMyBookings.mockRejectedValue(new ApiError(401, "Please sign in again."));
    await expect(BookingsPage()).rejects.toThrow(
      `NEXT_REDIRECT:/login?next=${encodeURIComponent("/bookings")}`,
    );
  });

  it("lets a server error through so the retry screen shows", async () => {
    getMyBookings.mockRejectedValue(new ApiError(502, "down"));
    await expect(BookingsPage()).rejects.toMatchObject({ status: 502 });
  });
});
