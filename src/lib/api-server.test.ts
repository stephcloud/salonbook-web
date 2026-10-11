// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

import { getCurrentUser, loginRedirectUrl, requireUser } from "./api-server";

const USER = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Ada",
  email: "ada@example.com",
  role: "client",
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.stubEnv("API_URL", "https://api.example.com/api/v1");
  cookieGet.mockReturnValue({ value: "tok" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  cookieGet.mockReset();
  redirect.mockClear();
});

describe("getCurrentUser", () => {
  it("returns null without a cookie and does not call the API", async () => {
    cookieGet.mockReturnValue(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await getCurrentUser()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the user and sends the token as a bearer header", async () => {
    const fetchMock = vi.fn(async () => Response.json(USER));
    vi.stubGlobal("fetch", fetchMock);
    expect(await getCurrentUser()).toEqual(USER);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.example.com/api/v1/auth/me");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer tok");
  });

  it.each([401, 403])(
    "returns null when the API answers %i",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json({ detail: "no" }, { status })),
      );
      expect(await getCurrentUser()).toBeNull();
    },
  );

  it("throws on a 5xx instead of signing the user out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 503 })),
    );
    await expect(getCurrentUser()).rejects.toThrow();
  });

  it("throws when the API cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(getCurrentUser()).rejects.toThrow(
      "The server is not responding.",
    );
  });
});

describe("loginRedirectUrl", () => {
  it("encodes a safe path", () => {
    expect(loginRedirectUrl("/book/abc?service=1&x=2")).toBe(
      "/login?next=%2Fbook%2Fabc%3Fservice%3D1%26x%3D2",
    );
  });

  it.each(["https://evil.com", "//evil.com", "relative"])(
    "drops an unsafe path (%s)",
    (next) => {
      expect(loginRedirectUrl(next)).toBe("/login");
    },
  );
});

describe("requireUser", () => {
  it("returns the user when signed in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(USER)),
    );
    expect(await requireUser("/bookings")).toEqual(USER);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to /login with an encoded next when signed out", async () => {
    cookieGet.mockReturnValue(undefined);
    await expect(requireUser("/book/abc?service=1")).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fbook%2Fabc%3Fservice%3D1",
    );
    expect(redirect).toHaveBeenCalledWith(
      "/login?next=%2Fbook%2Fabc%3Fservice%3D1",
    );
  });

  it("redirects to plain /login for an unsafe next", async () => {
    cookieGet.mockReturnValue(undefined);
    await expect(requireUser("//evil.com")).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
