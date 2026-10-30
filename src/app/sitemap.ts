import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { ApiError } from "@/lib/api";
import { getSitemapSalonIds } from "@/lib/api-server";
import { sitemapEntries } from "@/lib/sitemap-entries";

const DAY_IN_SECONDS = 60 * 60 * 24;

// A failed scan throws, so it is never cached and the next request retries.
const cachedSalonIds = unstable_cache(
  getSitemapSalonIds,
  ["sitemap-salon-ids"],
  {
    revalidate: DAY_IN_SECONDS,
  },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Rendered per request (the build must not call the API); the salon ids are
  // cached for a day instead.
  await connection();
  try {
    return sitemapEntries(await cachedSalonIds());
  } catch (error) {
    // Status or error name only: a message can quote the response body.
    const reason =
      error instanceof ApiError
        ? error.status
        : error instanceof Error
          ? error.name
          : "unknown";
    console.warn(
      `sitemap: salon list unavailable (${reason}), serving the fixed entries`,
    );
    return sitemapEntries([]);
  }
}
