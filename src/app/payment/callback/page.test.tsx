import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
vi.mock("@/lib/api-server", () => ({
  requireUser: (next: string) => requireUser(next),
}));

const getBooking = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getBooking: (...args: unknown[]) => getBooking(...args),
}));

import PaymentCallbackPage from "./page";

describe("PaymentCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    requireUser.mockResolvedValue({ id: "c1", role: "client" });
  });

  it("requires sign-in and comes back to the callback path (without any query string)", async () => {
    await PaymentCallbackPage();
    expect(requireUser).toHaveBeenCalledWith("/payment/callback");
  });

  it("does not take the URL as input: the page is called without searchParams", () => {
    // The page function declares no parameters, so Paystack's ?reference=...
    // cannot reach it.
    expect(PaymentCallbackPage.length).toBe(0);
  });

  it("renders inside the main landmark and helps when nothing was saved", async () => {
    render(await PaymentCallbackPage());
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      await screen.findByRole("heading", {
        name: "We could not find a payment to check",
      }),
    ).toBeInTheDocument();
    expect(getBooking).not.toHaveBeenCalled();
  });
});
