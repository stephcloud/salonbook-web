import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import DashboardError from "./error";

beforeEach(() => vi.clearAllMocks());

describe("dashboard error page", () => {
  it("says the dashboard could not load and offers a way to browse salons", () => {
    render(<DashboardError reset={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not load your dashboard",
    );
    expect(screen.getByRole("link", { name: "Browse salons" })).toHaveAttribute(
      "href",
      "/salons",
    );
  });

  it("on Retry asks the server again and resets the error boundary", async () => {
    const reset = vi.fn();
    render(<DashboardError reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not refresh or reset until Retry is pressed", () => {
    const reset = vi.fn();
    render(<DashboardError reset={reset} />);
    expect(refresh).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });
});
