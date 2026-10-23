import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Wordmark } from "./Wordmark";

describe("Wordmark", () => {
  it("is one home link named SalonBook, with no stray spaces", () => {
    render(<Wordmark />);
    const link = screen.getByRole("link", { name: "SalonBook" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveTextContent(/^SalonBook$/);
  });

  it("puts the letters in one inline child, so they flow as one run of text", () => {
    render(<Wordmark />);
    const link = screen.getByRole("link", { name: "SalonBook" });
    expect(link.children).toHaveLength(1);
    expect(link.firstElementChild?.tagName).toBe("SPAN");
  });

  it("styles only the S and B with the accent in italic", () => {
    render(<Wordmark />);
    const accents = screen
      .getByRole("link", { name: "SalonBook" })
      .querySelectorAll(".text-brand-accent");
    expect([...accents].map((el) => el.textContent)).toEqual(["S", "B"]);
    for (const el of accents) expect(el).toHaveClass("italic");
  });

  it("adds placement classes and keeps the touch target and focus ring", () => {
    render(<Wordmark className="-ml-2" />);
    expect(screen.getByRole("link", { name: "SalonBook" })).toHaveClass(
      "-ml-2",
      "px-2",
      "min-h-11",
      "rounded-full",
      "focus-visible:ring-3",
      "focus-visible:ring-ring",
    );
  });
});
