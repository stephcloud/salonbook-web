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
});
