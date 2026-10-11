// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { ApiError } from "@/lib/api";
import { getMyBooking, getMyBookings } from "./api-server";

const API_URL = "https://api.example.test/api/v1";
const ID = "69994867-62d8-480e-b4a6-6f8de65f75c4";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("signed-in booking reads", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", API_URL);
    cookieGet.mockReturnValue({ value: "token-123" });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    cookieGet.mockReset();
  });

  it("sends the cookie's token as a Bearer header and returns the server clock", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T10:00:00Z"));
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: ID }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getMyBooking(ID);

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${API_URL}/bookings/${ID}`,
    );
    const init = fetchMock.mock.calls[0][1] as { headers: Headers };
    expect(init.headers.get("authorization")).toBe("Bearer token-123");
    expect(result).toEqual({
      booking: { id: ID },
      serverNow: Date.parse("2026-10-11T10:00:00Z"),
    });
  });

  it("throws a 401 ApiError without calling the API when there is no cookie", async () => {
    cookieGet.mockReturnValue(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const error = await getMyBooking(ID).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([403, 404, 422])(
    "keeps the status %i for the page to handle",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockImplementation(async () =>
            jsonResponse({ detail: "nope" }, status),
          ),
      );
      const error = await getMyBooking(ID).catch((e: unknown) => e);
      expect(error).toMatchObject({ status, message: "nope" });
    },
  );

  it("encodes the booking id", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    await getMyBooking("a/../b");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${API_URL}/bookings/a%2F..%2Fb`,
    );
  });

  it("lists up to 100 bookings", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getMyBookings()).resolves.toEqual([]);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${API_URL}/bookings?limit=100`,
    );
  });
});
