// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/time", () => {
  afterEach(() => vi.useRealTimers());

  it("answers with the server clock in milliseconds and is never cached", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T12:00:00Z"));

    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      now: Date.parse("2026-10-11T12:00:00Z"),
    });
  });
});
