// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { ApiError } from "@/lib/api";
import { getMySalons, getStylistAvailability } from "./api-server";

const API_URL = "https://api.example.test/api/v1";
const STYLIST = "44444444-4444-4444-8444-444444444444";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("owner reads", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", API_URL);
    cookieGet.mockReturnValue({ value: "token-123" });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    cookieGet.mockReset();
  });

  it("getMySalons asks for up to 100 with the cookie's token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: "s1" }]));
    vi.stubGlobal("fetch", fetchMock);

    const salons = await getMySalons();

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${API_URL}/salons/mine?limit=100`,
    );
    const init = fetchMock.mock.calls[0][1] as { headers: Headers };
    expect(init.headers.get("authorization")).toBe("Bearer token-123");
    expect(salons).toEqual([{ id: "s1" }]);
  });

  it("getMySalons throws ApiError 403 for a client", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "owners only" }, 403)),
    );

    const error = await getMySalons().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
  });

  it("getMySalons throws ApiError 401 without calling the API when there is no token", async () => {
    cookieGet.mockReturnValue(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const error = await getMySalons().catch((e: unknown) => e);

    expect((error as ApiError).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getStylistAvailability reads the stylist's rules with the token", async () => {
    const body = { stylist_id: STYLIST, rules: [] };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(body));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getStylistAvailability(STYLIST);

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${API_URL}/stylists/${STYLIST}/availability`,
    );
    const init = fetchMock.mock.calls[0][1] as { headers: Headers };
    expect(init.headers.get("authorization")).toBe("Bearer token-123");
    expect(result).toEqual(body);
  });

  it("getStylistAvailability encodes the id and passes a 403 on", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: "forbidden" }, 403));
    vi.stubGlobal("fetch", fetchMock);

    const error = await getStylistAvailability("a/../b").catch(
      (e: unknown) => e,
    );

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${API_URL}/stylists/a%2F..%2Fb/availability`,
    );
    expect((error as ApiError).status).toBe(403);
  });
});
