import { describe, expect, it } from "vitest";
import { buildForwardHeaders } from "./headers";

const incoming = new Headers({
  accept: "application/json",
  "content-type": "application/json",
  cookie: "sb_token=secret; other=1",
  host: "salonbook.example",
  authorization: "Bearer attacker",
  "x-forwarded-for": "1.2.3.4",
});

describe("buildForwardHeaders", () => {
  it("adds the bearer token when there is one", () => {
    const out = buildForwardHeaders(incoming, "tok");
    expect(out.get("authorization")).toBe("Bearer tok");
    expect(out.get("content-type")).toBe("application/json");
    expect(out.get("accept")).toBe("application/json");
  });

  it("never forwards Cookie or Host", () => {
    const out = buildForwardHeaders(incoming, "tok");
    expect(out.has("cookie")).toBe(false);
    expect(out.has("host")).toBe(false);
    expect(out.has("x-forwarded-for")).toBe(false);
  });

  it("sends no Authorization without a token, even if the browser sent one", () => {
    const out = buildForwardHeaders(incoming, undefined);
    expect(out.has("authorization")).toBe(false);
  });
});
