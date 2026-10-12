// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

const SALON_ID = "11111111-1111-1111-1111-111111111111";
const TOKEN = "owner-token-value";

function call(body: unknown, token: string | null = TOKEN) {
  return POST(
    new NextRequest("http://localhost/api/dashboard/stylists", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        ...(token ? { cookie: `sb_token=${token}` } : {}),
      },
    }),
  );
}

function sentToApi(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url,
    headers: init.headers as Headers,
    body: JSON.parse(String(init.body)) as Record<string, string>,
  };
}

beforeEach(() => {
  vi.stubEnv("API_URL", "https://api.example.com/api/v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/dashboard/stylists", () => {
  it("creates the stylist with a throw-away example.com email and a long password", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        {
          id: "22222222-2222-2222-2222-222222222222",
          name: "Ada",
          email: "stylist-x@example.com",
          role: "stylist",
          salon_id: SALON_ID,
          image_url: null,
        },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await call({ salon_id: SALON_ID, name: "Ada" });
    expect(res.status).toBe(201);

    const sent = sentToApi(fetchMock);
    expect(sent.url).toBe(
      `https://api.example.com/api/v1/salons/${SALON_ID}/stylists`,
    );
    expect(sent.headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(sent.body.email).toMatch(/^stylist-[0-9a-f]{24}@example\.com$/);
    expect(sent.body.password.length).toBeGreaterThanOrEqual(32);
    expect(sent.body.name).toBe("Ada");
  });

  it("returns only id, name and image_url, never the email or password", async () => {
    let sentPassword = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        sentPassword = JSON.parse(String(init.body)).password;
        return Response.json(
          {
            id: "22222222-2222-2222-2222-222222222222",
            name: "Ada",
            email: "stylist-x@example.com",
            role: "stylist",
            salon_id: SALON_ID,
            image_url: "https://img.example.com/a.png",
          },
          { status: 201 },
        );
      }),
    );

    const res = await call({
      salon_id: SALON_ID,
      name: "Ada",
      image_url: "https://img.example.com/a.png",
    });
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      id: "22222222-2222-2222-2222-222222222222",
      name: "Ada",
      image_url: "https://img.example.com/a.png",
    });
    expect(text).not.toContain(sentPassword);
    expect(text).not.toContain("stylist-x");
  });

  it("uses a different email and password for every stylist", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        { id: "22222222-2222-2222-2222-222222222222", name: "A" },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await call({ salon_id: SALON_ID, name: "A" });
    await call({ salon_id: SALON_ID, name: "B" });
    const [a, b] = fetchMock.mock.calls.map(
      ([, init]) =>
        JSON.parse(String((init as RequestInit).body)) as Record<
          string,
          string
        >,
    );
    expect(a.email).not.toBe(b.email);
    expect(a.password).not.toBe(b.password);
  });

  it("does not log anything", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ detail: "boom" }, { status: 500 })),
    );
    await call({ salon_id: SALON_ID, name: "Ada" });
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    log.mockRestore();
    error.mockRestore();
  });

  it("answers 401 without calling the API when there is no cookie", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await call({ salon_id: SALON_ID, name: "Ada" }, null);
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the login cookies when the API says 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ detail: "invalid credentials" }, { status: 401 }),
      ),
    );
    const res = await call({ salon_id: SALON_ID, name: "Ada" });
    expect(res.status).toBe(401);
    const cookies = res.headers.getSetCookie().join(";");
    expect(cookies).toMatch(/sb_token=;/);
    expect(cookies).toMatch(/Max-Age=0/i);
  });

  it("passes a 403 for a client through", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ detail: "forbidden" }, { status: 403 }),
      ),
    );
    const res = await call({ salon_id: SALON_ID, name: "Ada" });
    expect(res.status).toBe(403);
  });

  it("returns 422 field errors without echoing the submitted body or the email and password fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const sent = JSON.parse(String(init.body)) as { password: string };
        return Response.json(
          {
            detail: [
              {
                type: "string_pattern_mismatch",
                loc: ["body", "image_url"],
                msg: "String should match pattern",
                input: "http://x",
              },
              {
                type: "x",
                loc: ["body", "password"],
                msg: "bad password",
                input: sent.password,
              },
            ],
          },
          { status: 422 },
        );
      }),
    );
    const res = await call({
      salon_id: SALON_ID,
      name: "Ada",
      image_url: "http://x",
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.detail).toEqual([
      { loc: ["body", "image_url"], msg: "String should match pattern" },
    ]);
  });

  it("rejects a malformed request without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await call({ salon_id: "not-a-uuid", name: "Ada" })).status).toBe(
      400,
    );
    expect((await call({ salon_id: SALON_ID })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
