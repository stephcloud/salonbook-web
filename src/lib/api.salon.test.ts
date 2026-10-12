import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createSalon, updateSalon } from "@/lib/api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const SALON_ID = "11111111-1111-4111-8111-111111111111";

describe("createSalon", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs the body to /salons through the proxy and returns the new salon", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: SALON_ID }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const input = {
      name: "Pink Studio",
      address: "12 Admiralty Way",
      phone: "08012345678",
      cancellation_hours: 24,
      deposit_amount: 500000,
    };

    const salon = await createSalon(input);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/proxy/salons");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(input);
    expect(salon).toEqual({ id: SALON_ID });
  });

  it("surfaces the server's 422 field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            detail: [
              {
                loc: ["body", "phone"],
                msg: "String should have at least 3 characters",
              },
            ],
          },
          422,
        ),
      ),
    );

    const error = await createSalon({
      name: "x",
      address: "y",
      phone: "08",
      cancellation_hours: 24,
      deposit_amount: 1,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).fieldErrors).toEqual({
      phone: "String should have at least 3 characters",
    });
  });
});

describe("updateSalon", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("PATCHes only the given fields to the salon's own path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: SALON_ID }));
    vi.stubGlobal("fetch", fetchMock);

    await updateSalon(SALON_ID, { name: "New name" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/proxy/salons/${SALON_ID}`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ name: "New name" });
  });

  it("keeps an explicit null so the image can be cleared", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: SALON_ID }));
    vi.stubGlobal("fetch", fetchMock);

    await updateSalon(SALON_ID, { image_url: null });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ image_url: null });
  });

  it("encodes the id so it cannot change the path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await updateSalon("a/../b", { name: "x" });

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/proxy/salons/a%2F..%2Fb",
    );
  });

  it("raises ApiError with the status for a 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ detail: "not your salon" }, 403)),
    );

    const error = await updateSalon(SALON_ID, { name: "x" }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
  });
});
