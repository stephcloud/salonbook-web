// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { makePlaceholderCredentials } from "./credentials";

describe("makePlaceholderCredentials", () => {
  it("uses an address at the reserved domain example.com", () => {
    const { email } = makePlaceholderCredentials();
    expect(email).toMatch(/^stylist-[0-9a-f]{24}@example\.com$/);
  });

  it("gives a different email and password every time", () => {
    const all = Array.from({ length: 20 }, () => makePlaceholderCredentials());
    expect(new Set(all.map((c) => c.email)).size).toBe(20);
    expect(new Set(all.map((c) => c.password)).size).toBe(20);
  });

  it("makes a long url-safe password", () => {
    const { password } = makePlaceholderCredentials();
    expect(password.length).toBeGreaterThanOrEqual(8);
    expect(password).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
