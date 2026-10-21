import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShareSalonLink } from "./ShareSalonLink";

describe("ShareSalonLink", () => {
  it("shows the salon's public path, a Copy button and a preview link to it", () => {
    render(<ShareSalonLink salonId="abc-123" status="approved" />);
    expect(screen.getByText("/salons/abc-123")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy salon link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Preview as a customer" }),
    ).toHaveAttribute("href", "/salons/abc-123");
  });

  it("adds no note once the salon is approved", () => {
    render(<ShareSalonLink salonId="abc-123" status="approved" />);
    expect(screen.queryByText(/not found/)).toBeNull();
  });

  it.each([
    ["pending", "until your salon is approved."],
    ["suspended", "while your salon is suspended."],
  ] as const)(
    "explains the link shows not found while %s, and keeps Copy",
    (status, reason) => {
      render(<ShareSalonLink salonId="abc-123" status={status} />);
      expect(
        screen.getByText(
          `Customers who open this link will see “not found” ${reason}`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Copy salon link" }),
      ).toBeInTheDocument();
    },
  );
});
