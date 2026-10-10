import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OwnersOnlyNotice } from "./OwnersOnlyNotice";

describe("OwnersOnlyNotice", () => {
  it("tells clients the area is for salon owners and links to salons", () => {
    render(<OwnersOnlyNotice />);
    expect(
      screen.getByRole("heading", { name: "This area is for salon owners" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse salons" })).toHaveAttribute(
      "href",
      "/salons",
    );
  });
});
