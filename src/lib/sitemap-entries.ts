import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** The home page, the salon list, then one entry per (approved) salon id. */
export function sitemapEntries(salonIds: string[]): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1 },
    { url: `${SITE_URL}/salons`, priority: 0.9 },
    ...salonIds.map((id) => ({
      url: `${SITE_URL}/salons/${encodeURIComponent(id)}`,
      priority: 0.7,
    })),
  ];
}
