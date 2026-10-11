import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ROLE_COOKIE,
  clearedCookieOptions,
  parseRole,
  tokenCookieOptions,
} from "./cookie";

afterEach(() => vi.unstubAllEnvs());

describe("token cookie options", () => {
  it("is httpOnly, Lax, path / and 30 minutes", () => {
    const o = tokenCookieOptions();
    expect(o).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 1800,
    });
  });

  it("is Secure only in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(tokenCookieOptions().secure).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(tokenCookieOptions().secure).toBe(false);
  });

  it("clears with maxAge 0", () => {
    expect(clearedCookieOptions().maxAge).toBe(0);
  });
});

describe("parseRole", () => {
  it("names the cookie sb_role", () => {
    expect(ROLE_COOKIE).toBe("sb_role");
  });

  it("accepts the two known roles", () => {
    expect(parseRole("owner")).toBe("owner");
    expect(parseRole("client")).toBe("client");
  });

  it.each([
    [undefined],
    [null],
    [""],
    ["admin"],
    ["Owner"],
    [" owner"],
    ["owner,client"],
  ])("treats %j as unknown", (value) => {
    expect(parseRole(value)).toBeNull();
  });
});
