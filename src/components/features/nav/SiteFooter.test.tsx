import { render, screen } from "@testing-library/react";
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

import { SiteFooter } from "./SiteFooter";

async function hrefs() {
  render(await SiteFooter());
  const nav = screen.getByRole("navigation", { name: "Footer" });
  return Array.from(nav.querySelectorAll("a")).map((a) =>
    a.getAttribute("href"),
  );
}

describe("SiteFooter", () => {
  beforeEach(() => jar.clear());

  it("links guests only to pages that exist", async () => {
    expect(await hrefs()).toEqual(["/salons", "/#faq", "/login", "/register"]);
  });

  it("hides sign in and register once signed in", async () => {
    jar.set("sb_token", "t");
    expect(await hrefs()).toEqual(["/salons", "/#faq"]);
  });
});
