import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchClockSkew } from "@/lib/api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const START = Date.parse("2026-10-11T12:00:00Z");

describe("fetchClockSkew", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("asks /api/time with no caching", async () => {
    vi.setSystemTime(START);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ now: START }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchClockSkew();

    expect(fetchMock).toHaveBeenCalledWith("/api/time", { cache: "no-store" });
  });

  it("returns server time minus device time, taken at the middle of the round trip", async () => {
    vi.setSystemTime(START);
    // The request takes 400 ms. The server read its clock in the middle (device
    // time START + 200) and said it was START + 10_200: the server is 10 s ahead.
    const fetchMock = vi.fn().mockImplementation(async () => {
      vi.setSystemTime(START + 400);
      return jsonResponse({ now: START + 10_200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchClockSkew()).resolves.toBe(10_000);
  });

  it("is 0 when the device and the server agree", async () => {
    vi.setSystemTime(START);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => jsonResponse({ now: START })),
    );
    await expect(fetchClockSkew()).resolves.toBe(0);
  });

  it("is negative when the device clock is ahead", async () => {
    vi.setSystemTime(START + 60_000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => jsonResponse({ now: START })),
    );
    await expect(fetchClockSkew()).resolves.toBe(-60_000);
  });

  it("trusts a round trip of exactly 2 seconds, so the midpoint is at most 1 second out", async () => {
    vi.setSystemTime(START);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        vi.setSystemTime(START + 2000);
        return jsonResponse({ now: START + 1000 });
      }),
    );
    await expect(fetchClockSkew()).resolves.toBe(0);
  });

  it("gives up (null) on a round trip just over 2 seconds", async () => {
    vi.setSystemTime(START);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        vi.setSystemTime(START + 2001);
        return jsonResponse({ now: START + 1000 });
      }),
    );
    await expect(fetchClockSkew()).resolves.toBeNull();
  });

  it("gives up (null) when the round trip is too slow to trust", async () => {
    vi.setSystemTime(START);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        vi.setSystemTime(START + 8000);
        return jsonResponse({ now: START + 4000 });
      }),
    );
    await expect(fetchClockSkew()).resolves.toBeNull();
  });

  it.each([
    ["a failed request", () => Promise.reject(new TypeError("fetch failed"))],
    ["a server error", async () => jsonResponse({ now: START }, 500)],
    ["a body with no number", async () => jsonResponse({ now: "noon" })],
    ["a body that is not an object", async () => jsonResponse("hello")],
    [
      "a body that is not JSON",
      async () => new Response("<html>", { status: 200 }),
    ],
  ])("returns null for %s", async (_name, respond) => {
    vi.setSystemTime(START);
    vi.stubGlobal("fetch", vi.fn().mockImplementation(respond));
    await expect(fetchClockSkew()).resolves.toBeNull();
  });
});
