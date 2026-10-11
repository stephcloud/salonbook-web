import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createBooking, getSlots } from "@/lib/api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const STYLIST = "44444444-4444-4444-8444-444444444444";
const SERVICE = "22222222-2222-4222-8222-222222222222";

describe("getSlots", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls the slots endpoint through the proxy with service_id and date", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ stylist_id: STYLIST, service_id: SERVICE, slots: [] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await getSlots(STYLIST, SERVICE, "2026-10-12");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `/api/proxy/stylists/${STYLIST}/slots?service_id=${SERVICE}&date=2026-10-12`,
    );
    expect(init.method).toBe("GET");
  });

  it("encodes the stylist id so it cannot change the path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ slots: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await getSlots("a/../b", SERVICE, "2026-10-12");

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/proxy/stylists/a%2F..%2Fb/slots?",
    );
  });
});

describe("createBooking", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs only the three fields, with the slot string unchanged", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: "b1" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await createBooking({
      stylist_id: STYLIST,
      service_id: SERVICE,
      starts_at: "2026-10-12T09:00:00+01:00",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/proxy/bookings");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      stylist_id: STYLIST,
      service_id: SERVICE,
      starts_at: "2026-10-12T09:00:00+01:00",
    });
  });

  it("surfaces the API's status and message as an ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { detail: "That time slot is no longer available." },
            409,
          ),
        ),
    );

    const error = await createBooking({
      stylist_id: STYLIST,
      service_id: SERVICE,
      starts_at: "2026-10-12T09:00:00+01:00",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      message: "That time slot is no longer available.",
    });
  });
});
