// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

const getSitemapSalonIds = vi.fn<() => Promise<string[]>>();

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/api-server", () => ({
  getSitemapSalonIds: () => getSitemapSalonIds(),
}));

import sitemap from "./sitemap";

describe("sitemap", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists every salon the API returns", async () => {
    getSitemapSalonIds.mockResolvedValueOnce(["s1", "s2"]);
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toEqual([
      SITE_URL,
      `${SITE_URL}/salons`,
      `${SITE_URL}/salons/s1`,
      `${SITE_URL}/salons/s2`,
    ]);
  });

  it("falls back to the fixed entries and logs only the status when the API fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    getSitemapSalonIds.mockRejectedValueOnce(
      new ApiError(503, "secret detail from the server"),
    );

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual([SITE_URL, `${SITE_URL}/salons`]);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain("503");
    expect(message).not.toContain("secret");
  });

  it("logs only the error name for a non-API failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    getSitemapSalonIds.mockRejectedValueOnce(
      new SyntaxError('"<html>secret" is not valid JSON'),
    );

    await sitemap();

    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain("SyntaxError");
    expect(message).not.toContain("secret");
  });
});
