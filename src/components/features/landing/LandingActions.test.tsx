import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingActions } from "./LandingActions";

const names = () => screen.getAllByRole("link").map((link) => link.textContent);

describe("LandingActions", () => {
  it("gives guests Find a salon and Register your salon", () => {
    render(<LandingActions viewer="guest" />);
    expect(names()).toEqual(["Find a salon", "Register your salon"]);
    expect(
      screen.getByRole("link", { name: "Register your salon" }),
    ).toHaveAttribute("href", "/register");
  });

  it("makes Find a salon the solid pill and Register the outlined one", () => {
    render(<LandingActions viewer="guest" />);
    expect(screen.getByRole("link", { name: "Find a salon" })).toHaveClass(
      "bg-primary",
    );
    const register = screen.getByRole("link", { name: "Register your salon" });
    expect(register).toHaveClass("border-2", "border-primary");
    expect(register).not.toHaveClass("border-transparent");
  });

  it("hides every icon from screen readers", () => {
    const { container } = render(<LandingActions viewer="guest" />);
    const icons = container.querySelectorAll("svg");
    expect(icons).toHaveLength(2);
    for (const icon of icons) {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("stacks on phones and sits side by side from sm", () => {
    render(<LandingActions viewer="guest" />);
    expect(screen.getAllByRole("link")[0].parentElement).toHaveClass(
      "flex-col",
      "sm:flex-row",
    );
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
