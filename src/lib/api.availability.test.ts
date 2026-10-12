import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getAvailability, setAvailability } from "@/lib/api";

const STYLIST_ID = "22222222-2222-4222-8222-222222222222";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("availability calls", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads a stylist's rules through the proxy", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ stylist_id: STYLIST_ID, rules: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAvailability(STYLIST_ID);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/proxy/stylists/${STYLIST_ID}/availability`);
    expect(init.method).toBe("GET");
    expect(result.rules).toEqual([]);
  });

  it("PUTs the full rule list as { rules }", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ stylist_id: STYLIST_ID, rules: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const rules = [
      {
        kind: "working" as const,
        weekday: 0,
        start_time: "09:00:00",
        end_time: "17:00:00",
        off_date: null,
      },
    ];

    await setAvailability(STYLIST_ID, rules);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/proxy/stylists/${STYLIST_ID}/availability`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ rules });
  });

  it("keeps the 422 detail with its row index", async () => {
    const detail = [
      {
        type: "value_error",
        loc: ["body", "rules", 2],
        msg: "Value error, end_time must be after start_time",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail }, 422)),
    );

    const error = await setAvailability(STYLIST_ID, []).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).detail).toEqual(detail);
  });
});
