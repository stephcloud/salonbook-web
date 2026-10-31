import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CtaButton } from "./CtaButton";

function badgeOf(link: HTMLElement) {
  const svg = link.querySelector("svg");
  return { svg, badge: svg?.parentElement };
}

describe("CtaButton", () => {
  it("is a link named by its text only, with the icon hidden", () => {
    render(
      <CtaButton href="/salons" icon="search">
        Find a salon
      </CtaButton>,
    );
    const link = screen.getByRole("link", { name: "Find a salon" });
    expect(link).toHaveAttribute("href", "/salons");
    const { svg } = badgeOf(link);
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("data-icon", "search");
  });

  it("makes the primary pill solid plum with a soft-tint badge and a shadow", () => {
    render(
      <CtaButton href="/salons" icon="search">
        Find a salon
      </CtaButton>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass(
      "rounded-full",
      "bg-primary",
      "text-primary-foreground",
      "shadow-md",
      "shadow-primary/25",
    );
    expect(badgeOf(link).badge).toHaveClass(
      "rounded-full",
      "bg-secondary",
      "text-primary",
    );
  });

  it("makes the outline pill plum-bordered with a solid plum badge and a right arrow", () => {
    render(
      <CtaButton href="/register" variant="outline" icon="arrow">
        Register your salon
      </CtaButton>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass("border-2", "border-primary", "text-primary");
    expect(link).not.toHaveClass("bg-primary", "border-transparent");
    const { svg, badge } = badgeOf(link);
    expect(badge).toHaveClass("bg-primary", "text-primary-foreground");
    expect(svg).toHaveAttribute("data-icon", "arrow");
  });

  it("makes the light pill white with plum text and a white focus ring for plum panels", () => {
    render(
      <CtaButton href="/register" variant="light" icon="arrow">
        Set up your salon
      </CtaButton>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass(
      "bg-card",
      "text-primary",
      "min-h-11",
      "focus-visible:ring-3",
      "focus-visible:ring-primary-foreground",
      "focus-visible:ring-offset-primary",
    );
    expect(link).not.toHaveClass(
      "bg-primary",
      "focus-visible:ring-ring",
      "focus-visible:ring-offset-background",
    );
    expect(badgeOf(link).badge).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
    );
  });

  it("nudges only the arrow on hover or focus, and not with reduced motion", () => {
    const { rerender } = render(
      <CtaButton href="/register" variant="outline" icon="arrow">
        Register your salon
      </CtaButton>,
    );
    expect(badgeOf(screen.getByRole("link")).svg).toHaveClass(
      "group-hover:translate-x-0.5",
      "group-focus-visible:translate-x-0.5",
      "motion-reduce:group-hover:translate-x-0",
      "motion-reduce:group-focus-visible:translate-x-0",
      "motion-reduce:transition-none",
    );
    rerender(
      <CtaButton href="/salons" icon="search">
        Find a salon
      </CtaButton>,
    );
    expect(badgeOf(screen.getByRole("link")).svg).not.toHaveClass(
      "group-hover:translate-x-0.5",
    );
  });

  // Class contract only: jsdom has no layout. The real height (56px) and the
  // ring were checked in Chrome.
  it("declares a 44px floor, a focus ring kept in high-contrast mode and full width on phones", () => {
    render(
      <CtaButton href="/salons" icon="search">
        Find a salon
      </CtaButton>,
    );
    const link = screen.getByRole("link");
    expect(link).not.toHaveClass("outline-none");
    expect(link).toHaveClass(
      "min-h-11",
      "outline-hidden",
      "focus-visible:ring-3",
      "focus-visible:ring-ring",
      "w-full",
      "sm:w-auto",
    );
  });
});
