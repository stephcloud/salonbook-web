import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchClockSkew = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchClockSkew: () => fetchClockSkew(),
}));

import { STALE_PAYLOAD_MS, trackClockSkew } from "./clock-skew";

const SERVER_NOW = Date.parse("2026-10-11T12:00:00Z");

describe("trackClockSkew", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    fetchClockSkew.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("applies the render stamp straight away, so server and browser agree on the first paint", () => {
    vi.setSystemTime(SERVER_NOW + 3000);
    fetchClockSkew.mockReturnValue(new Promise(() => {}));
    const apply = vi.fn();

    trackClockSkew(SERVER_NOW, { apply });

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(-3000);
  });

  it("then applies the fresh measurement and tells the caller to redraw", async () => {
    vi.setSystemTime(SERVER_NOW);
    fetchClockSkew.mockResolvedValue(-1200);
    const apply = vi.fn();
    const onMeasured = vi.fn();

    trackClockSkew(SERVER_NOW, { apply, onMeasured });
    await vi.waitFor(() => expect(onMeasured).toHaveBeenCalled());

    expect(apply).toHaveBeenNthCalledWith(2, -1200);
  });

  it("keeps the render stamp when the measurement fails", async () => {
    vi.setSystemTime(SERVER_NOW);
    fetchClockSkew.mockResolvedValue(null);
    const apply = vi.fn();
    const onMeasured = vi.fn();
    const onStale = vi.fn();

    trackClockSkew(SERVER_NOW, { apply, onMeasured, onStale });
    await Promise.resolve();
    await Promise.resolve();

    expect(apply).toHaveBeenCalledTimes(1);
    expect(onMeasured).not.toHaveBeenCalled();
    expect(onStale).not.toHaveBeenCalled();
  });

  describe("detecting a page that was restored from a cache", () => {
    it("does not call onStale for a page rendered a moment ago", async () => {
      // Rendered 2 seconds before the browser asked: measured skew is 2 s above the render skew.
      vi.setSystemTime(SERVER_NOW);
      const renderSkew = SERVER_NOW - Date.now();
      fetchClockSkew.mockResolvedValue(renderSkew + 2000);
      const onStale = vi.fn();
      const onMeasured = vi.fn();

      trackClockSkew(SERVER_NOW, { apply: vi.fn(), onMeasured, onStale });
      await vi.waitFor(() => expect(onMeasured).toHaveBeenCalled());

      expect(onStale).not.toHaveBeenCalled();
    });

    it("calls onStale once when the render stamp is more than 15 seconds old", async () => {
      vi.setSystemTime(SERVER_NOW);
      const renderSkew = SERVER_NOW - Date.now();
      fetchClockSkew.mockResolvedValue(renderSkew + STALE_PAYLOAD_MS + 1000);
      const onStale = vi.fn();
      const onMeasured = vi.fn();

      trackClockSkew(SERVER_NOW, { apply: vi.fn(), onMeasured, onStale });
      await vi.waitFor(() => expect(onMeasured).toHaveBeenCalled());

      expect(onStale).toHaveBeenCalledTimes(1);
    });

    it("treats exactly 15 seconds as still fresh and one millisecond more as stale", async () => {
      vi.setSystemTime(SERVER_NOW);
      const renderSkew = SERVER_NOW - Date.now();

      fetchClockSkew.mockResolvedValue(renderSkew + STALE_PAYLOAD_MS);
      const atLimit = vi.fn();
      const measuredAtLimit = vi.fn();
      trackClockSkew(SERVER_NOW, {
        apply: vi.fn(),
        onMeasured: measuredAtLimit,
        onStale: atLimit,
      });
      await vi.waitFor(() => expect(measuredAtLimit).toHaveBeenCalled());
      expect(atLimit).not.toHaveBeenCalled();

      fetchClockSkew.mockResolvedValue(renderSkew + STALE_PAYLOAD_MS + 1);
      const overLimit = vi.fn();
      const measuredOverLimit = vi.fn();
      trackClockSkew(SERVER_NOW, {
        apply: vi.fn(),
        onMeasured: measuredOverLimit,
        onStale: overLimit,
      });
      await vi.waitFor(() => expect(measuredOverLimit).toHaveBeenCalled());
      expect(overLimit).toHaveBeenCalledTimes(1);
    });

    it("does not call onStale for a wrong device clock alone (the stamp is still fresh)", async () => {
      // The device is 10 minutes ahead; the page was rendered just now. The
      // render skew and the measured skew are both about -10 minutes.
      vi.setSystemTime(SERVER_NOW + 10 * 60_000);
      const renderSkew = SERVER_NOW - Date.now();
      fetchClockSkew.mockResolvedValue(renderSkew + 500);
      const onStale = vi.fn();
      const onMeasured = vi.fn();

      trackClockSkew(SERVER_NOW, { apply: vi.fn(), onMeasured, onStale });
      await vi.waitFor(() => expect(onMeasured).toHaveBeenCalled());

      expect(onStale).not.toHaveBeenCalled();
    });
  });

  it("does nothing more once stopped", async () => {
    vi.setSystemTime(SERVER_NOW);
    let finish: (value: number) => void = () => {};
    fetchClockSkew.mockReturnValue(
      new Promise<number>((resolve) => {
        finish = resolve;
      }),
    );
    const apply = vi.fn();
    const onMeasured = vi.fn();

    const stop = trackClockSkew(SERVER_NOW, { apply, onMeasured });
    stop();
    finish(-500);
    await Promise.resolve();
    await Promise.resolve();

    expect(apply).toHaveBeenCalledTimes(1);
    expect(onMeasured).not.toHaveBeenCalled();
  });
});
