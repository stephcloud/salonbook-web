import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Reads the real tokens, so a palette change that breaks contrast fails here.
// Vitest runs from the project root. Tokens must be 6-digit hex; anything else
// makes `token` throw, which fails loudly rather than passing.
const css = readFileSync(resolve("src/app/globals.css"), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i"));
  if (!match) throw new Error(`No hex value for --${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: [text: string, background: string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["foreground", "secondary"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "secondary"],
  ["primary-foreground", "primary"],
  ["primary-foreground", "primary-dark"],
  ["primary", "background"],
  ["primary", "card"],
  ["primary", "secondary"],
  ["primary-dark", "background"],
  ["primary-dark", "card"],
  ["primary-dark", "secondary"],
  ["destructive", "card"],
  ["destructive", "secondary"],
  ["status-pending-fg", "status-pending-bg"],
  ["status-confirmed-fg", "status-confirmed-bg"],
  ["status-cancelled-fg", "status-cancelled-bg"],
  ["status-refunded-fg", "status-refunded-bg"],
];

describe("theme contrast", () => {
  it.each(TEXT_PAIRS)("%s on %s is at least 4.5:1", (text, background) => {
    expect(contrast(token(text), token(background))).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("every status token is mapped to a Tailwind colour", () => {
    const names = [...css.matchAll(/^\s*--(status-[a-z-]+):/gm)].map(
      ([, name]) => name,
    );
    expect(names).toHaveLength(12);
    for (const name of names) {
      expect(css).toContain(`--color-${name}: var(--${name});`);
    }
  });

  it("input borders are at least 3:1 on cards and the page", () => {
    expect(contrast(token("input"), token("card"))).toBeGreaterThanOrEqual(3);
    expect(
      contrast(token("input"), token("background")),
    ).toBeGreaterThanOrEqual(3);
  });

  // Large bold text (WCAG large-text threshold), and it passes 4.5:1 today too.
  it.each(["card", "secondary", "background"])(
    "the wordmark accent is at least 3:1 on %s",
    (background) => {
      expect(
        contrast(token("brand-accent"), token(background)),
      ).toBeGreaterThanOrEqual(3);
    },
  );

  it("the focus ring is at least 3:1 on the page", () => {
    expect(contrast(token("ring"), token("background"))).toBeGreaterThanOrEqual(
      3,
    );
  });
});
