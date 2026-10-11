import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getSalon, getSalons, isNotFound } from "@/lib/api";

const API_URL = "https://api.example.test/api/v1";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
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

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${API_URL}/salons?limit=20&offset=40`,
    );
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.has("authorization")).toBe(false);
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

  it("throws an ApiError that isNotFound recognises for a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "not found" }, 404)),
    );

    const error = await getSalon("abc").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(isNotFound(error)).toBe(true);
  });

  it("does not treat a server error as not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "boom" }, 500)),
    );
    const error = await getSalon("abc").catch((e: unknown) => e);
    expect(isNotFound(error)).toBe(false);
  });
});
