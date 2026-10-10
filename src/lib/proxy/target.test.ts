import { describe, expect, it } from "vitest";
import { buildTargetUrl } from "./target";

const API = "https://api.example.com/api/v1";

describe("buildTargetUrl", () => {
  it("joins API_URL, path and query string", () => {
    expect(buildTargetUrl(API, ["salons", "1"], "?a=1&b=2")).toBe(
      `${API}/salons/1?a=1&b=2`,
    );
  });

  it("works with a trailing slash on API_URL and no query", () => {
    expect(buildTargetUrl(`${API}/`, ["salons"], "")).toBe(`${API}/salons`);
  });

  it.each([
    [[".."]],
    [["salons", "..", "x"]],
    [["."]],
    [["%2e%2e"]],
    [["%2E%2E"]],
    [["a%2f..%2fb"]],
    [["a%5Cb"]],
    [[""]],
    [["bad%zz"]],
    [["a%00b"]],
    [["login?"]],
    [["login#x"]],
    [["100%25"]],
  ])("rejects %j", (segments) => {
    expect(buildTargetUrl(API, segments, "")).toBeNull();
  });

  it("rejects an empty path", () => {
    expect(buildTargetUrl(API, [], "")).toBeNull();
  });
});
