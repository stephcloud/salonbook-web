// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

const SALON_ID = "11111111-1111-1111-1111-111111111111";

function ask() {
  return POST(
    new NextRequest("http://localhost/api/dashboard/stylists", {
      method: "POST",
      body: JSON.stringify({ salon_id: SALON_ID, name: "Ada" }),
      headers: {
        "content-type": "application/json",
        cookie: "sb_token=owner-token",
      },
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("API_URL", "https://api.example.com/api/v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/dashboard/stylists: answers it cannot pass on", () => {
  it("maps an upstream 404 to salon not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ detail: "nope" }, { status: 404 })),
    );
    expect((await ask()).status).toBe(404);
  });

  it("turns an upstream 5xx into a 502 with a plain message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Internal Server Error", { status: 500 })),
    );
    const res = await ask();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: "Could not add the stylist. Please try again.",
    });
  });

  it("never passes an odd status such as 204 through", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    expect((await ask()).status).toBe(502);
  });

  it("answers 502 when the API cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    expect((await ask()).status).toBe(502);
  });

  it("answers 502 when the new stylist cannot be read back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not json", { status: 201 })),
    );
    expect((await ask()).status).toBe(502);
  });

  it("does not blame the form when only the generated password failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { detail: [{ loc: ["body", "password"], msg: "bad", type: "x" }] },
          { status: 422 },
        ),
      ),
    );
    const res = await ask();
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/Please try again/);
  });
});
