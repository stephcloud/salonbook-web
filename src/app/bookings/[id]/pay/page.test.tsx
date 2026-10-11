import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
vi.mock("@/lib/api-server", () => ({
  requireUser: (next: string) => requireUser(next),
}));

import PayBookingPage from "./page";

const props = (id: string) =>
  ({ params: Promise.resolve({ id }) }) as unknown as Parameters<
    typeof PayBookingPage
  >[0];

describe("PayBookingPage placeholder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "u1", role: "client" });
  });

  it("requires sign-in and returns to the same pay path", async () => {
    await PayBookingPage(props("abc-123"));
    expect(requireUser).toHaveBeenCalledWith("/bookings/abc-123/pay");
  });

  it("shows the booking id", async () => {
    render(await PayBookingPage(props("abc-123")));
    expect(
      screen.getByRole("heading", { name: "Booking created" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Booking id: abc-123/)).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});
