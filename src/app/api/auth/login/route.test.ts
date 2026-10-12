// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const SECRET = "jwt-secret-value";
const USER = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Ada",
  email: "ada@example.com",
  role: "client",
  created_at: "2026-01-01T00:00:00Z",
};

function loginRequest(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubEnv("API_URL", "https://api.example.com/api/v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/auth/login", () => {
  function mockHappyPath() {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/auth/login")
        ? Response.json({ access_token: SECRET, token_type: "bearer" })
        : Response.json(USER),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("sets an httpOnly Lax cookie and returns only the user", async () => {
    mockHappyPath();
    const res = await POST(
      loginRequest({ email: "ada@example.com", password: "password1" }),
    );
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).not.toContain(SECRET);
    expect(JSON.parse(text)).toEqual({ user: USER });

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`sb_token=${SECRET}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).toMatch(/Max-Age=1800/i);
    expect(cookie).not.toMatch(/;\s*Secure/i);
  });

  it.each(["owner", "client"])(
    "also sets a display-only %s role cookie",
    async (role) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) =>
          url.endsWith("/auth/login")
            ? Response.json({ access_token: SECRET, token_type: "bearer" })
            : Response.json({ ...USER, role }),
        ),
      );
      const res = await POST(
        loginRequest({ email: "ada@example.com", password: "password1" }),
      );
      const roleCookie = res.headers
        .getSetCookie()
        .find((c) => c.startsWith("sb_role="));
      expect(roleCookie).toContain(`sb_role=${role};`);
      expect(roleCookie).toMatch(/HttpOnly/i);
      expect(roleCookie).toMatch(/Max-Age=1800/i);
      expect(roleCookie).toMatch(/Path=\//i);
    },
  );

  it("clears the role cookie for a role it does not know", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/auth/login")
          ? Response.json({ access_token: SECRET, token_type: "bearer" })
          : Response.json({ ...USER, role: "admin" }),
      ),
    );
    const res = await POST(
      loginRequest({ email: "ada@example.com", password: "password1" }),
    );
    expect(res.status).toBe(200);
    const role = res.headers
      .getSetCookie()
      .find((c) => c.startsWith("sb_role="));
    // A stale role from an earlier session is cleared, not kept.
    expect(role).toContain("sb_role=;");
    expect(role).toMatch(/Max-Age=0/i);
  });

  it("marks the cookie Secure in production", async () => {
    mockHappyPath();
    vi.stubEnv("NODE_ENV", "production");
    const res = await POST(
      loginRequest({ email: "ada@example.com", password: "password1" }),
    );
    expect(res.headers.get("set-cookie")).toMatch(/;\s*Secure/i);
  });

  it("sends the credentials as JSON and /auth/me with the bearer token", async () => {
    const fetchMock = mockHappyPath();
    await POST(
      loginRequest({ email: "ada@example.com", password: "password1" }),
    );
    const [loginUrl, loginInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(loginUrl).toBe("https://api.example.com/api/v1/auth/login");
    expect(JSON.parse(loginInit.body as string)).toEqual({
      email: "ada@example.com",
      password: "password1",
    });
    const [, meInit] = fetchMock.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    expect((meInit.headers as Headers).get("authorization")).toBe(
      `Bearer ${SECRET}`,
    );
  });

  it("returns a safe 401 for a wrong password and sets no cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ detail: "invalid credentials" }, { status: 401 }),
      ),
    );
    const res = await POST(
      loginRequest({ email: "ada@example.com", password: "nope" }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "Incorrect email or password.",
    });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("passes 422 field errors through", async () => {
    const detail = [
      { loc: ["body", "email"], msg: "bad", type: "x", input: "hunter2" },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ detail }, { status: 422 })),
    );
    const res = await POST(loginRequest({ email: "x", password: "y" }));
    expect(res.status).toBe(422);
    const text = await res.text();
    expect(text).not.toContain("hunter2");
    expect(JSON.parse(text).detail).toEqual([
      { loc: ["body", "email"], msg: "bad" },
    ]);
  });

  it("returns a clear 502 when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    const res = await POST(
      loginRequest({ email: "ada@example.com", password: "password1" }),
    );
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/not responding/i);
  });
});
