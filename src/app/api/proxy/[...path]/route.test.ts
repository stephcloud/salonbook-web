// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./route";

const API = "https://api.example.com/api/v1";

function makeRequest(
  path: string,
  init: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    cookie?: string;
  } = {},
) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  return new NextRequest(`http://localhost/api/proxy/${path}`, {
    method: init.method,
    body: init.body,
    headers,
  });
}

function ctx(path: string) {
  return {
    params: Promise.resolve({ path: path.split("?")[0].split("/") }),
  };
}

beforeEach(() => {
  vi.stubEnv("API_URL", API);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("/api/proxy/[...path]", () => {
  it("adds the bearer token from the cookie and keeps the query string", async () => {
    const fetchMock = vi.fn(async () => Response.json({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(
      makeRequest("salons?limit=5", {
        cookie: "sb_token=tok123; other=1",
        headers: { host: "evil.example" },
      }),
      ctx("salons"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${API}/salons?limit=5`);
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer tok123");
    expect(headers.has("cookie")).toBe(false);
    expect(headers.has("host")).toBe(false);
  });

  it("forwards without Authorization when there is no cookie", async () => {
    const fetchMock = vi.fn(async () => Response.json({}, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(
      makeRequest("auth/register", {
        method: "POST",
        body: JSON.stringify({ a: 1 }),
        headers: { "content-type": "application/json" },
      }),
      ctx("auth/register"),
    );

    expect(res.status).toBe(201);
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect((init.headers as Headers).has("authorization")).toBe(false);
    expect(init.body).toBeInstanceOf(ArrayBuffer);
  });

  it("rejects path traversal without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest("salons/x"), {
      params: Promise.resolve({ path: ["salons", "..", "admin"] }),
    });
    expect(res.status).toBe(404);

    const encoded = await GET(makeRequest("x"), {
      params: Promise.resolve({ path: ["%2e%2e", "admin"] }),
    });
    expect(encoded.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose the login endpoint (it would return the token)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(
      makeRequest("auth/login", { method: "POST", body: "{}" }),
      ctx("auth/login"),
    );
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the cookie and returns 401 when the API says 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ detail: "invalid credentials" }, { status: 401 }),
      ),
    );
    const res = await GET(
      makeRequest("auth/me", { cookie: "sb_token=expired" }),
      ctx("auth/me"),
    );
    expect(res.status).toBe(401);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("sb_token=;");
    expect(cookie).toMatch(/Max-Age=0/i);
  });

  it("passes 204 through with no body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    const res = await DELETE(
      makeRequest("services/1", { method: "DELETE", cookie: "sb_token=t" }),
      ctx("services/1"),
    );
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("passes error statuses and JSON through (409, 422)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ detail: "slot taken" }, { status: 409 }),
      ),
    );
    const res = await POST(
      makeRequest("bookings", { method: "POST", body: "{}" }),
      ctx("bookings"),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ detail: "slot taken" });
  });

  it("retries a GET once, then returns a clear JSON error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(makeRequest("salons"), ctx("salons"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/not responding/i);
  });
});
