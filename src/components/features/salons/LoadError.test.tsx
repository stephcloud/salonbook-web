import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoadError } from "./LoadError";

describe("LoadError", () => {
  it("keeps the default wording and Back to home link", () => {
    render(<LoadError title="We could not load this" reset={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The server may be waking up or your connection dropped",
    );
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("accepts its own wording and second link, and Retry still calls reset", async () => {
    const reset = vi.fn();
    render(
      <LoadError
        title="We could not check your payment just now"
        description="Your payment is safe."
        secondary={{ href: "/bookings", label: "My bookings" }}
        reset={reset}
      />,
    );
    expect(screen.getByText("Your payment is safe.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My bookings" })).toHaveAttribute(
      "href",
      "/bookings",
    );
    expect(screen.queryByText(/server may be waking up/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
