// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("clears the cookie and returns 204", async () => {
    const res = await POST();
    expect(res.status).toBe(204);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("sb_token=;");
    expect(cookie).toMatch(/Max-Age=0/i);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it("clears the role cookie with it", async () => {
    const res = await POST();
    const role = res.headers
      .getSetCookie()
      .find((c) => c.startsWith("sb_role="));
    expect(role).toContain("sb_role=;");
    expect(role).toMatch(/Max-Age=0/i);
  });
});
