import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Plus_Jakarta_Sans: () => ({ variable: "font-var" }),
  Playfair_Display: () => ({ variable: "heading-font-var" }),
}));
vi.mock("./globals.css", () => ({}));

import GlobalError from "./global-error";

// It renders its own <html>, so it is mounted into the document itself.
function renderGlobalError(
  error: Error & { digest?: string },
  reset = vi.fn(),
) {
  render(<GlobalError error={error} reset={reset} />, {
    container: document,
  });
  return reset;
}

describe("global error page", () => {
  it("brings its own html with a message, the reference and a retry button", () => {
    renderGlobalError(Object.assign(new Error("boom"), { digest: "abc123" }));
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByText("Reference: abc123")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("leaves out the reference when there is no digest", () => {
    renderGlobalError(new Error("boom"));
    expect(screen.queryByText(/Reference:/)).toBeNull();
  });

  it("calls reset when Try again is pressed", () => {
    const reset = renderGlobalError(new Error("boom"));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
