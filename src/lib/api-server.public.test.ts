// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { ApiError } from "@/lib/api";
import {
  getSalon,
  getSalonServices,
  getSalonStylists,
  getSalons,
  isMissingResource,
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
