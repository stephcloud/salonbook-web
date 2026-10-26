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
    expect(svg).toHaveClass("lucide-search");
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
    expect(svg).toHaveClass("lucide-arrow-right");
  });

  it("nudges only the arrow on hover, and not with reduced motion", () => {
    const { rerender } = render(
      <CtaButton href="/register" variant="outline" icon="arrow">
        Register your salon
      </CtaButton>,
    );
    expect(badgeOf(screen.getByRole("link")).svg).toHaveClass(
      "group-hover:translate-x-0.5",
      "motion-reduce:group-hover:translate-x-0",
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

  it("keeps a 44px+ target, a visible focus ring and full width on phones", () => {
    render(
      <CtaButton href="/salons" icon="search">
        Find a salon
      </CtaButton>,
    );
    expect(screen.getByRole("link")).toHaveClass(
      "min-h-13",
      "focus-visible:ring-3",
      "focus-visible:ring-ring",
      "w-full",
      "sm:w-auto",
    );
  });
});
