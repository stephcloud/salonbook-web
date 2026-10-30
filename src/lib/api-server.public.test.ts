// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { ApiError, isMissingResource } from "@/lib/api";
import {
  getSalon,
  getSalonNames,
  getSalonServices,
  getSalonStylists,
  getSalons,
  getSitemapSalonIds,
  searchSalons,
} from "./api-server";

const API_URL = "https://api.example.test/api/v1";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function calledUrls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((call) => String(call[0]));
}

describe("public salon calls", () => {
  beforeEach(() => vi.stubEnv("API_URL", API_URL));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("asks for 20 salons at the right offset, without a token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await getSalons(3);

    expect(calledUrls(fetchMock)).toEqual([
      `${API_URL}/salons?limit=20&offset=40`,
    ]);
    const init = fetchMock.mock.calls[0][1] as { headers: Headers };
    expect(init.headers.has("authorization")).toBe(false);
  });

  describe("getSitemapSalonIds", () => {
    function ids(count: number, prefix: string) {
      return Array.from({ length: count }, (_, i) => ({
        id: `${prefix}-${i}`,
      }));
    }

    it("reads 100 at a time and stops at a short page", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(ids(100, "a")))
        .mockResolvedValueOnce(jsonResponse(ids(1, "b")));
      vi.stubGlobal("fetch", fetchMock);

      const result = await getSitemapSalonIds();

      expect(calledUrls(fetchMock)).toEqual([
        `${API_URL}/salons?limit=100&offset=0`,
        `${API_URL}/salons?limit=100&offset=100`,
      ]);
      expect(result).toHaveLength(101);
      expect(result.at(-1)).toBe("b-0");
    });

    it("stops after 5 pages even when every page is full", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(async () => jsonResponse(ids(100, "x")));
      vi.stubGlobal("fetch", fetchMock);

      const result = await getSitemapSalonIds();

      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(result).toHaveLength(500);
    });

    it("throws when the API fails, so a failure is never cached", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ detail: "boom" }, 500)),
      );
      await expect(getSitemapSalonIds()).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("searchSalons", () => {
    function salons(count: number, prefix: string) {
      return Array.from({ length: count }, (_, i) => ({
        id: `${prefix}-${i}`,
        name: `${prefix} ${i}`,
      }));
    }

    it("scans 100 at a time until a short page and filters by name", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse([...salons(99, "Other"), ...salons(1, "Pink")]),
        )
        .mockResolvedValueOnce(jsonResponse(salons(2, "pink")));
      vi.stubGlobal("fetch", fetchMock);

      const result = await searchSalons("PINK");

      expect(calledUrls(fetchMock)).toEqual([
        `${API_URL}/salons?limit=100&offset=0`,
        `${API_URL}/salons?limit=100&offset=100`,
      ]);
      expect(result.salons.map((s) => s.name)).toEqual([
        "Pink 0",
        "pink 0",
        "pink 1",
      ]);
      expect(result.hasNext).toBe(false);
      expect(result.truncated).toBe(false);
    });

    it("pages the matches and says whether another page exists", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockImplementation(async () => jsonResponse(salons(25, "Pink"))),
      );

      const first = await searchSalons("pink", 1);
      expect(first.salons).toHaveLength(20);
      expect(first.hasNext).toBe(true);

      const second = await searchSalons("pink", 2);
      expect(second.salons).toHaveLength(5);
      expect(second.hasNext).toBe(false);

      expect((await searchSalons("pink", 3)).salons).toEqual([]);
    });

    it("stops after 5 requests even when every page is full", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(async () => jsonResponse(salons(100, "Other")));
      vi.stubGlobal("fetch", fetchMock);

      await expect(searchSalons("zzz")).resolves.toEqual({
        salons: [],
        hasNext: false,
        truncated: true,
      });
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });

    it("retries a 503 once, then throws an ApiError", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(async () =>
          jsonResponse({ detail: "waking" }, 503),
        );
      vi.stubGlobal("fetch", fetchMock);

      const error = await searchSalons("pink").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSalonNames", () => {
    it("makes one call for 100, de-duplicates, skips blanks and caps at 100", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse([
          { id: "a", name: "Pink Studio" },
          { id: "b", name: "  pink studio " },
          { id: "c", name: "Café Glow" },
          { id: "d", name: "cafe glow" },
          { id: "e", name: "   " },
          ...Array.from({ length: 150 }, (_, i) => ({
            id: `x${i}`,
            name: `Salon ${i}`,
          })),
        ]),
      );
      vi.stubGlobal("fetch", fetchMock);

      const names = await getSalonNames();

      expect(calledUrls(fetchMock)).toEqual([
        `${API_URL}/salons?limit=100&offset=0`,
      ]);
      expect(names).toHaveLength(100);
      expect(names.slice(0, 3)).toEqual([
        "Pink Studio",
        "Café Glow",
        "Salon 0",
      ]);
    });

    it("throws when the API is down so the caller can ignore it", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async () => jsonResponse({}, 503)),
      );
      await expect(getSalonNames()).rejects.toBeInstanceOf(ApiError);
    });
  });

  it("asks for up to 100 services and stylists of one salon", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await getSalonServices("abc");
    await getSalonStylists("abc");

    expect(calledUrls(fetchMock)).toEqual([
      `${API_URL}/salons/abc/services?limit=100`,
      `${API_URL}/salons/abc/stylists?limit=100`,
    ]);
  });

  it("URL-encodes the salon id so it cannot change the path", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await getSalon("a b/../c?x=1");

    expect(calledUrls(fetchMock)).toEqual([
      `${API_URL}/salons/a%20b%2F..%2Fc%3Fx%3D1`,
    ]);
  });

  it("retries once when the first attempt fails (server waking up)", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getSalons()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on a 503 answer and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "waking" }, 503))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getSalons()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second 502 with an ApiError", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => jsonResponse({ detail: "bad" }, 502));
    vi.stubGlobal("fetch", fetchMock);

    const error = await getSalons().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps a timeout to a 504 ApiError", async () => {
    const timeout = Object.assign(new Error("timed out"), {
      name: "TimeoutError",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));

    const error = await getSalons().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(504);
  });

  it("treats 404 and 422 as a missing salon", async () => {
    for (const status of [404, 422]) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ detail: "nope" }, status)),
      );
      const error = await getSalonServices("abc").catch((e: unknown) => e);
      expect(isMissingResource(error)).toBe(true);
    }
  });

  it("does not treat a server error as a missing salon", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "boom" }, 500)),
    );
    const error = await getSalon("abc").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(isMissingResource(error)).toBe(false);
  });
});
