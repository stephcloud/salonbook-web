import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingActions } from "./LandingActions";

const names = () => screen.getAllByRole("link").map((link) => link.textContent);

describe("LandingActions", () => {
  it("gives guests Find a salon and Register your salon", () => {
    render(<LandingActions viewer="guest" />);
    expect(names()).toEqual(["Find a salon", "Register your salon"]);
  });

  it("gives owners Find a salon and their dashboard", () => {
    render(<LandingActions viewer="owner" />);
    expect(names()).toEqual(["Find a salon", "Go to your dashboard"]);
    expect(screen.getByRole("link", { name: /dashboard/ })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("gives clients only Find a salon", () => {
    render(<LandingActions viewer="client" />);
    expect(names()).toEqual(["Find a salon"]);
  });
});
