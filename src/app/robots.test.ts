import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/site";
import robots from "./robots";

describe("robots", () => {
  it("keeps crawlers off the signed-in pages and points to the sitemap", () => {
    const result = robots();
    expect(result.rules).toMatchObject({
      allow: "/",
      disallow: ["/api/", "/book", "/bookings", "/dashboard", "/payment"],
    });
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
