import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHealth } from "@/lib/api";

const API_URL = "https://api.example.test/api/v1";

describe("getHealth", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", API_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("calls /health on the API origin, not under /api/v1", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getHealth()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/health");
  });

  it("retries once and succeeds when the API was asleep", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getHealth()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports the status when the API keeps failing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getHealth();
    expect(result).toEqual({
      ok: false,
      message: "The API answered with status 503.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns an error result when API_URL is missing", async () => {
    vi.stubEnv("API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getHealth()).resolves.toEqual({
      ok: false,
      message: "API_URL is not set",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
