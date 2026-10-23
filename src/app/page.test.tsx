import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

import Home, { metadata } from "./page";
import { HERO_PHOTO_ALT } from "@/components/features/landing/Hero";
import { FAQS } from "@/lib/landing-content";

function hero() {
  return within(
    screen.getByRole("region", { name: /Online booking for your salon/ }),
  );
}

function finalCta() {
  return within(
    screen.getByRole("region", { name: "Ready to take bookings online?" }),
  );
}

async function show() {
  render(await Home());
}

describe("landing page", () => {
  beforeEach(() => jar.clear());

  it("has one h1, the skip-link target and the section headings", async () => {
    await show();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    for (const name of [
      "Booking a salon should not be this hard",
      "Who SalonBook is for",
      "What SalonBook does today",
      "How it works",
      "A calmer way to run your bookings",
      "Pricing",
      "Questions, answered",
      "Ready to take bookings online?",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }
  });

  it("names the problem and gives three steps to clients and owners", async () => {
    await show();
    expect(screen.getByText("No-shows")).toBeInTheDocument();
    expect(screen.getByText("No deposits")).toBeInTheDocument();
    for (const name of ["For clients", "For salon owners"]) {
      const card = screen.getByRole("heading", {
        level: 3,
        name,
      }).parentElement;
      expect(card?.querySelectorAll("ol > li")).toHaveLength(3);
    }
  });

  it("treats a signed-in visitor with a missing or odd role like a client", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "admin");
    await show();
    expect(
      hero().getByRole("link", { name: "Find a salon" }),
    ).toBeInTheDocument();
    expect(
      finalCta().getByRole("link", { name: "Find a salon" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Register your salon" }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Go to your dashboard" }),
    ).toBeNull();
  });

  it("shows the hero photo with its alt text on every screen size", async () => {
    await show();
    const photo = hero().getByRole("img", { name: HERO_PHOTO_ALT });
    expect(HERO_PHOTO_ALT).toBe(
      "A salon with pink walls, pink chairs, gold-framed lit mirrors and a crystal chandelier",
    );
    expect(photo.getAttribute("src")).toContain("hero.jpg");
    expect(photo).toHaveClass("object-cover");
    expect(photo).toHaveAttribute(
      "sizes",
      "(min-width: 64rem) min(calc(50vw + 48px), 1000px), 100vw",
    );
    const frame = screen.getByTestId("hero-photo");
    expect(frame).not.toHaveClass("hidden");
    // No box: the photo melts into the page through a mask instead of
    // sitting in a rounded, bordered frame.
    expect(frame).toHaveClass("hero-photo-fade", "w-full");
    expect(frame.className).not.toMatch(
      /(^|\s)(\w+:)?(rounded|border)(-|\s|$)/,
    );
    // Under the text below `lg`; from `lg` it fills the right side and
    // bleeds to the viewport edge, starting just left of centre, capped so
    // a very wide screen doesn't crop the portrait photo to a thin band.
    expect(frame).toHaveClass(
      "lg:absolute",
      "lg:right-0",
      "lg:w-[calc(50%+48px)]",
      "lg:max-w-[1000px]",
    );
    expect(frame.querySelector("[data-placeholder]")).toBeNull();
  });

  it("keeps the hero text clear of the photo on desktop", async () => {
    await show();
    // The text column ends 56px left of centre; the photo starts 48px left
    // at most. The text paints above the photo, focus rings included.
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.parentElement).toHaveClass("lg:max-w-[440px]");
    expect(heading.parentElement?.parentElement).toHaveClass(
      "max-w-5xl",
      "px-4",
      "relative",
      "z-10",
    );
  });

  it("renders the hero outside the max-width column so it can bleed", async () => {
    await show();
    const section = screen.getByRole("region", {
      name: /Online booking for your salon/,
    });
    expect(section.parentElement).toBe(screen.getByRole("main"));
    expect(screen.getByRole("main").className).not.toMatch(/max-w-/);
  });

  it("gives the anchored sections the ids the header links to", async () => {
    await show();
    for (const id of ["features", "how-it-works", "pricing", "faq"]) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("lists the features and the answers a visitor can open", async () => {
    await show();
    expect(screen.getByText("Real free times")).toBeInTheDocument();
    expect(document.querySelectorAll("details")).toHaveLength(FAQS.length);
    expect(
      screen.getByText(/A pending booking is held for 15 minutes/),
    ).toBeInTheDocument();
  });

  it("shows the exact pricing placeholder", async () => {
    await show();
    expect(
      screen.getAllByText("Free while we launch, simple monthly plan later"),
    ).not.toHaveLength(0);
  });

  it("offers Find a salon and Register your salon to visitors", async () => {
    await show();
    expect(hero().getByRole("link", { name: "Find a salon" })).toHaveAttribute(
      "href",
      "/salons",
    );
    expect(
      hero().getByRole("link", { name: "Register your salon" }),
    ).toHaveAttribute("href", "/register");
  });

  it("sends a signed-in owner to the dashboard instead of register", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "owner");
    await show();
    expect(
      hero().getByRole("link", { name: "Go to your dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
    expect(
      screen.queryByRole("link", { name: "Register your salon" }),
    ).toBeNull();
  });

  it("shows a signed-in client only Find a salon", async () => {
    jar.set("sb_token", "t");
    jar.set("sb_role", "client");
    await show();
    expect(
      hero().getByRole("link", { name: "Find a salon" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Register your salon" }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Go to your dashboard" }),
    ).toBeNull();
  });

  it("sets a title and description for the home page", () => {
    expect(metadata.title).toBe(
      "SalonBook · Book your salon appointment online",
    );
    expect(metadata.description).toBeTruthy();
  });
});
