import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createBooking,
  getBooking,
  getSlots,
  listBookings,
  cancelBooking,
  payBooking,
} from "@/lib/api";

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

const BOOKING = "69994867-62d8-480e-b4a6-6f8de65f75c4";

describe("getBooking", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("GETs one booking through the proxy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: BOOKING }));
    vi.stubGlobal("fetch", fetchMock);

    await getBooking(BOOKING);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/proxy/bookings/${BOOKING}`);
    expect(init.method).toBe("GET");
  });

  it("encodes the id so it cannot change the path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    await getBooking("a/../b");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/proxy/bookings/a%2F..%2Fb",
    );
  });
});

describe("payBooking", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to the pay endpoint with no body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ authorization_url: "https://x" }));
    vi.stubGlobal("fetch", fetchMock);

    await payBooking(BOOKING);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/proxy/bookings/${BOOKING}/pay`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it("surfaces the 409 for a booking that can no longer be paid", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { detail: "This booking can no longer be paid for." },
            409,
          ),
        ),
    );
    const error = await payBooking(BOOKING).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      message: "This booking can no longer be paid for.",
    });
  });
});

describe("listBookings", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks for up to 100 bookings through the proxy by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await listBookings();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/proxy/bookings?limit=100&offset=0");
    expect(init.method).toBe("GET");
  });

  it("passes a limit and an offset", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    await listBookings(20, 40);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/proxy/bookings?limit=20&offset=40",
    );
  });
});

describe("cancelBooking", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to the cancel endpoint with no body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: BOOKING, refund_due: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await cancelBooking(BOOKING);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/proxy/bookings/${BOOKING}/cancel`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(result).toMatchObject({ refund_due: true });
  });

  it("encodes the id so it cannot change the path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    await cancelBooking("a/../b");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/proxy/bookings/a%2F..%2Fb/cancel",
    );
  });

  it("surfaces the API's status and message as an ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "forbidden" }, 403)),
    );
    const error = await cancelBooking(BOOKING).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, message: "forbidden" });
  });
});
