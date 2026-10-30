import { describe, expect, it } from "vitest";
import { buttonVariants } from "./button";

const VARIANTS = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const;

// Unprefixed border colour classes (not `border`, widths, sides or variants
// like `hover:`/`aria-invalid:`), as they reach a link's `className`.
function borderColours(classes: string): string[] {
  return classes
    .split(/\s+/)
    .filter((c) => /^border-(?!\d|[xytrblse]-|[xytrblse]$)/.test(c));
}

describe("buttonVariants", () => {
  // Links use `buttonVariants()` directly, with no tailwind-merge, so two
  // border colours would be settled by CSS order, not by the variant.
  it.each(VARIANTS)("%s sets exactly one border colour", (variant) => {
    expect(borderColours(buttonVariants({ variant }))).toHaveLength(1);
  });

  it("gives outline links a plum border, not a transparent one", () => {
    const classes = buttonVariants({ variant: "outline", size: "lg" });
    expect(borderColours(classes)).toEqual(["border-primary"]);
    expect(classes.split(/\s+/)).toContain("border");
  });
  // Same reason: a base text size would beat the size's own on links.
  it.each([
    ["default", "text-sm"],
    ["lg", "text-base"],
    ["icon", "text-sm"],
    ["icon-lg", "text-base"],
  ] as const)("%s sets exactly one text size, %s", (size, expected) => {
    const sizes = buttonVariants({ size })
      .split(/\s+/)
      .filter((c) => /^text-(xs|sm|base|lg|xl)$/.test(c));
    expect(sizes).toEqual([expected]);
  });
});
