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
    const problem = within(
      screen.getByRole("region", {
        name: "Booking a salon should not be this hard",
      }),
    );
    expect(problem.getByText("The problem")).toBeInTheDocument();
    expect(problem.getAllByRole("listitem")).toHaveLength(3);
    expect(
      problem
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Booking by chat and phone", "No-shows", "No deposits"]);
    for (const text of [
      "Clients wait for a reply, owners juggle messages, and times get mixed up.",
      "A chair sits empty when someone does not turn up, and the time is lost.",
      "Without a deposit there is little reason to keep a booking or cancel in time.",
    ]) {
      expect(problem.getByText(text)).toBeInTheDocument();
    }
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
      "A smiling stylist braiding a seated client's hair in a pink salon",
    );
    expect(photo.getAttribute("src")).toContain("hero.jpg");
    expect(photo).toHaveClass("object-cover");
    expect(photo).toHaveAttribute(
      "sizes",
      "(min-width: 64rem) min(calc(50vw - 32px), 1000px), 100vw",
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
    // bleeds to the viewport edge, starting just right of centre, capped so
    // a very wide screen doesn't crop the photo to a thin band.
    expect(frame).toHaveClass(
      "lg:absolute",
      "lg:right-0",
      "lg:w-[calc(50%-32px)]",
      "lg:max-w-[1000px]",
    );
    expect(frame.querySelector("[data-placeholder]")).toBeNull();
  });

  it("keeps the hero text clear of the photo on desktop", async () => {
    await show();
    // The text column ends 24px right of centre; the photo starts 32px right
    // at most. The text paints above the photo, focus rings included.
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.parentElement).toHaveClass("lg:max-w-[520px]");
    expect(heading.parentElement?.parentElement).toBe(
      screen.getByTestId("hero-text"),
    );
    expect(screen.getByTestId("hero-text")).toHaveClass(
      "max-w-5xl",
      "px-4",
      "relative",
      "z-10",
    );
  });

  it("centres the hero text against the photo on desktop", async () => {
    await show();
    // The photo spans the section, whose height this block sets, so equal
    // top and bottom padding from `lg` centres the text.
    const text = screen.getByTestId("hero-text");
    expect(text).toHaveClass("lg:py-16");
    expect(text.className).not.toMatch(/lg:p[tb]-/);
  });

  it("anchors the desktop photo crop near the top for the stylist's headroom", async () => {
    await show();
    const photo = hero().getByRole("img", { name: HERO_PHOTO_ALT });
    expect(photo).toHaveClass("lg:object-[33%_15%]", "object-[57%_50%]");
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

  it("shows a Clients card then a Salon owners card, each with its list and link", async () => {
    await show();
    const section = within(
      screen.getByRole("region", { name: "Who SalonBook is for" }),
    );
    const cards = section.getAllByRole("group");
    expect(cards.map((card) => card.getAttribute("aria-labelledby"))).toEqual([
      "audience-clients",
      "audience-owners",
    ]);
    for (const [index, [title, tag, points, link, href]] of (
      [
        [
          "Clients",
          "For clients",
          [
            "Choose a service and a stylist",
            "See when they are really free",
            "Book without waiting for a reply",
            "Manage your bookings in one place",
          ],
          "Find a salon",
          "/salons",
        ],
        [
          "Salon owners",
          "For owners",
          [
            "Register and set up your salon, services, stylists and hours",
            "Share your salon link",
            "Deposits help protect your time",
          ],
          "Set up your salon",
          "/register",
        ],
      ] as const
    ).entries()) {
      const card = within(section.getByRole("group", { name: title }));
      expect(cards[index]).toBe(section.getByRole("group", { name: title }));
      // Not overflow-hidden: focus could scroll the card to the clipped circle.
      expect(cards[index]).toHaveClass("overflow-clip");
      expect(
        card.getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
      expect(card.getByText(tag)).toBeInTheDocument();
      expect(
        card.getAllByRole("listitem").map((item) => item.textContent),
      ).toEqual(points);
      for (const tick of card.getByRole("list").querySelectorAll("svg")) {
        expect(tick).toHaveAttribute("aria-hidden", "true");
      }
      expect(card.getByRole("link", { name: link })).toHaveAttribute(
        "href",
        href,
      );
    }
  });

  it("groups the features for clients and for owners", async () => {
    await show();
    for (const [group, titles] of [
      [
        "For your clients",
        [
          "Real free times",
          "Deposits",
          "Clear cancellations",
          "One link to share",
        ],
      ],
      [
        "For you, the owner",
        [
          "Services and prices",
          "Your stylists",
          "Weekly hours",
          "Bookings list",
        ],
      ],
    ] as const) {
      const box = within(screen.getByRole("group", { name: group }));
      expect(
        box.getByRole("heading", { level: 3, name: group }),
      ).toBeInTheDocument();
      expect(
        box.getAllByRole("heading", { level: 4 }).map((h) => h.textContent),
      ).toEqual(titles);
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

  it("has no tagline pill above the hero heading", async () => {
    await show();
    expect(hero().queryByText("Salon booking with deposits")).toBeNull();
  });

  it("stacks the final call-to-action buttons in its narrow md column", async () => {
    await show();
    const group = finalCta().getByRole("link", {
      name: "Find a salon",
    }).parentElement;
    expect(group).toHaveClass("sm:flex-row", "md:flex-col", "md:w-fit");
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
