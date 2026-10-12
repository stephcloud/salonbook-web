import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createService,
  createStylist,
  deleteService,
  listSalonServices,
  listSalonStylists,
  setStylistServices,
  updateService,
} from "@/lib/api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ID = "11111111-1111-4111-8111-111111111111";
const TRICKY = "a/b?c=1";
const TRICKY_ENCODED = "a%2Fb%3Fc%3D1";

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return () => {
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return { url, init };
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("listSalonServices and listSalonStylists", () => {
  it("GETs the salon's services through the proxy with a limit", async () => {
    const sent = stubFetch(jsonResponse([]));
    await expect(listSalonServices(ID)).resolves.toEqual([]);
    const { url, init } = sent();
    expect(url).toMatch(
      new RegExp(`^/api/proxy/salons/${ID}/services\\?limit=\\d+$`),
    );
    expect(init.method).toBe("GET");
  });

  it("GETs the salon's stylists through the proxy with a limit", async () => {
    const sent = stubFetch(jsonResponse([]));
    await listSalonStylists(ID);
    expect(sent().url).toMatch(
      new RegExp(`^/api/proxy/salons/${ID}/stylists\\?limit=\\d+$`),
    );
  });

  it("encodes the salon id so it cannot change the path", async () => {
    const sent = stubFetch(jsonResponse([]));
    await listSalonServices(TRICKY);
    expect(sent().url).toContain(`/salons/${TRICKY_ENCODED}/services?`);
  });
});

describe("createService", () => {
  it("POSTs the input to the salon's services and returns the service", async () => {
    const input = {
      name: "Braids",
      duration_minutes: 90,
      price_type: "fixed" as const,
      price: 500000,
    };
    const sent = stubFetch(jsonResponse({ id: ID, ...input }, 201));
    const created = await createService(ID, input);
    const { url, init } = sent();
    expect(url).toBe(`/api/proxy/salons/${ID}/services`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(input);
    expect(created.id).toBe(ID);
  });

  it("encodes the salon id", async () => {
    const sent = stubFetch(jsonResponse({}, 201));
    await createService(TRICKY, {
      name: "x",
      duration_minutes: 30,
      price_type: "quote",
    });
    expect(sent().url).toBe(`/api/proxy/salons/${TRICKY_ENCODED}/services`);
  });

  it("surfaces the server's 422 field errors", async () => {
    stubFetch(
      jsonResponse(
        { detail: [{ loc: ["body", "name"], msg: "Field required" }] },
        422,
      ),
    );
    const error = await createService(ID, {
      name: "",
      duration_minutes: 30,
      price_type: "quote",
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).fieldErrors).toEqual({ name: "Field required" });
  });
});

describe("updateService", () => {
  it("PATCHes only the given fields to the service's own path", async () => {
    const sent = stubFetch(jsonResponse({ id: ID }));
    await updateService(ID, { name: "New" });
    const { url, init } = sent();
    expect(url).toBe(`/api/proxy/services/${ID}`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ name: "New" });
  });

  it("keeps an explicit price: null", async () => {
    const sent = stubFetch(jsonResponse({ id: ID }));
    await updateService(ID, { price_type: "quote", price: null });
    expect(JSON.parse(String(sent().init.body))).toEqual({
      price_type: "quote",
      price: null,
    });
  });

  it("encodes the id", async () => {
    const sent = stubFetch(jsonResponse({}));
    await updateService(TRICKY, { name: "x" });
    expect(sent().url).toBe(`/api/proxy/services/${TRICKY_ENCODED}`);
  });

  it("raises ApiError with the status for a 404", async () => {
    stubFetch(jsonResponse({ detail: "Service not found" }, 404));
    const error = await updateService(ID, { name: "x" }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});

describe("deleteService", () => {
  it("DELETEs the service and resolves to undefined on a 204", async () => {
    const sent = stubFetch(new Response(null, { status: 204 }));
    await expect(deleteService(ID)).resolves.toBeUndefined();
    const { url, init } = sent();
    expect(url).toBe(`/api/proxy/services/${ID}`);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("encodes the id", async () => {
    const sent = stubFetch(new Response(null, { status: 204 }));
    await deleteService(TRICKY);
    expect(sent().url).toBe(`/api/proxy/services/${TRICKY_ENCODED}`);
  });

  it("raises ApiError 409 when the service has bookings", async () => {
    stubFetch(jsonResponse({ detail: "Service has bookings" }, 409));
    const error = await deleteService(ID).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
  });
});

describe("setStylistServices", () => {
  it("PUTs service_ids to the stylist's services", async () => {
    const sent = stubFetch(
      jsonResponse({ stylist_id: ID, service_ids: ["s1"] }),
    );
    await setStylistServices(ID, ["s1"]);
    const { url, init } = sent();
    expect(url).toBe(`/api/proxy/stylists/${ID}/services`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ service_ids: ["s1"] });
  });

  it("sends an empty list to clear every service", async () => {
    const sent = stubFetch(jsonResponse({ stylist_id: ID, service_ids: [] }));
    await setStylistServices(ID, []);
    expect(JSON.parse(String(sent().init.body))).toEqual({ service_ids: [] });
  });

  it("encodes the stylist id", async () => {
    const sent = stubFetch(jsonResponse({}));
    await setStylistServices(TRICKY, []);
    expect(sent().url).toBe(`/api/proxy/stylists/${TRICKY_ENCODED}/services`);
  });
});

describe("createStylist", () => {
  it("POSTs to our own route handler, not the proxy, and sends no credentials", async () => {
    const sent = stubFetch(
      jsonResponse({ id: ID, name: "Ada", image_url: null }, 201),
    );
    const created = await createStylist({ salon_id: ID, name: "Ada" });
    const { url, init } = sent();
    expect(url).toBe("/api/dashboard/stylists");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      salon_id: ID,
      name: "Ada",
    });
    expect(created).toEqual({ id: ID, name: "Ada", image_url: null });
  });

  it("raises ApiError with the status for a failure", async () => {
    stubFetch(jsonResponse({ error: "Not your salon" }, 403));
    const error = await createStylist({ salon_id: ID, name: "Ada" }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
  });
});
