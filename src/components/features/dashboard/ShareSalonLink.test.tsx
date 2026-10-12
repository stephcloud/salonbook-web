import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShareSalonLink } from "./ShareSalonLink";

describe("ShareSalonLink", () => {
  it("shows the salon's public path, a Copy button and a preview link to it", () => {
    render(<ShareSalonLink salonId="abc-123" />);
    expect(screen.getByText("/salons/abc-123")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy salon link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Preview as a customer" }),
    ).toHaveAttribute("href", "/salons/abc-123");
  });
});
