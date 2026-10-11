// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUpstream } from "./upstream";

afterEach(() => vi.unstubAllGlobals());

const timeoutError = () => {
  const e = new Error("timed out");
  e.name = "TimeoutError";
  return e;
};

function init(method: string) {
  return { method, headers: new Headers() };
}

describe("fetchUpstream", () => {
  it("retries a GET once after a network error", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchUpstream("https://x/y", init("GET"));
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchUpstream("https://x/y", init("GET"));
    expect(result).toEqual({ ok: false, reason: "unreachable" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not replay a POST that timed out", async () => {
    const fetchMock = vi.fn().mockRejectedValue(timeoutError());
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchUpstream("https://x/y", init("POST"));
    expect(result).toEqual({ ok: false, reason: "timeout" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not replay a POST after a connection error either", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchUpstream("https://x/y", init("POST"));
    expect(result).toEqual({ ok: false, reason: "unreachable" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
