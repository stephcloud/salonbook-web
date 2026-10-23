import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { HomeAnchors } from "./HomeAnchors";

describe("HomeAnchors", () => {
  beforeEach(() => {
    pathname = "/";
  });

  it("links to the landing sections on the home page", () => {
    render(<HomeAnchors />);
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute(
      "href",
      "/#features",
    );
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute(
      "href",
      "/#faq",
    );
  });

  it("renders nothing on other pages", () => {
    pathname = "/salons";
    const { container } = render(<HomeAnchors />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens and closes the phone menu with an accurate expanded state", async () => {
    render(<HomeAnchors />);
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("link", { name: "FAQ" }));
    expect(button).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(button);
    await userEvent.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("closes when focus moves past the menu", async () => {
    render(
      <>
        <HomeAnchors />
        <button type="button">After</button>
      </>,
    );
    const button = screen.getByRole("button", { name: "Menu" });
    await userEvent.click(button);
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Features" })).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "true");
    // Past How it works, Pricing and FAQ to the link after the menu.
    for (let i = 0; i < 4; i++) await userEvent.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on a tap outside, but not on a tap inside", async () => {
    render(
      <>
        <HomeAnchors />
        <p>Page</p>
      </>,
    );
    const button = screen.getByRole("button", { name: "Menu" });
    await userEvent.click(button);
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: screen.getByRole("list", { name: "Sections" }),
    });
    expect(button).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByText("Page"));
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
