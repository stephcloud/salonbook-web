import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/book", "/bookings", "/dashboard", "/payment"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
