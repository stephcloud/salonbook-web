import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/site";
import { sitemapEntries } from "./sitemap-entries";

describe("sitemapEntries", () => {
  it("lists the home page and the salon list when there are no salons", () => {
    expect(sitemapEntries([])).toEqual([
      { url: SITE_URL, priority: 1 },
      { url: `${SITE_URL}/salons`, priority: 0.9 },
    ]);
  });

  it("adds one entry per salon id, encoded", () => {
    const urls = sitemapEntries(["abc", "a b"]).map((entry) => entry.url);
    expect(urls.slice(2)).toEqual([
      `${SITE_URL}/salons/abc`,
      `${SITE_URL}/salons/a%20b`,
    ]);
  });
});
