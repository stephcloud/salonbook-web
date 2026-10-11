import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackClockSkew } from "./clock-skew";

// Uses the real fetchClockSkew with a pretend /api/time, to check that the
// sign of the measured skew agrees with how the render stamp is turned into one.

const SERVER_NOW = Date.parse("2026-10-11T12:00:00Z");

function stubTimeRoute(serverClockAtReply: () => number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify({ now: serverClockAtReply() }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

/** vi.waitFor moves the fake clock a little while it polls, so compare within 200 ms. */
function near(actual: number | undefined, expected: number) {
  expect(actual).toBeDefined();
  expect(Math.abs((actual as number) - expected)).toBeLessThan(200);
}

async function run(serverStamp: number) {
  const skews: number[] = [];
  const onStale = vi.fn();
  const onMeasured = vi.fn();
  trackClockSkew(serverStamp, {
    apply: (skew) => skews.push(skew),
    onMeasured,
    onStale,
  });
  await vi.waitFor(() => expect(onMeasured).toHaveBeenCalled());
  return { skews, onStale };
}

describe("trackClockSkew with the real clock measurement", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("agrees with the render stamp on a fresh page and a correct device clock (both about 0)", async () => {
    vi.setSystemTime(SERVER_NOW);
    stubTimeRoute(() => Date.now());
    const { skews, onStale } = await run(SERVER_NOW);
    near(skews[0], 0);
    near(skews[1], 0);
    expect(onStale).not.toHaveBeenCalled();
  });

  it("agrees on a fresh page when the device clock is an hour ahead (both about -1 hour)", async () => {
    // The server says it is SERVER_NOW; the device thinks it is an hour later.
    vi.setSystemTime(SERVER_NOW + 3_600_000);
    stubTimeRoute(() => SERVER_NOW);
    const { skews, onStale } = await run(SERVER_NOW);
    near(skews[0], -3_600_000);
    near(skews[1], -3_600_000);
    expect(onStale).not.toHaveBeenCalled();
  });

  it("flags a page rendered 10 minutes ago on a correct device clock as stale, and corrects the skew to 0", async () => {
    vi.setSystemTime(SERVER_NOW + 10 * 60_000);
    stubTimeRoute(() => Date.now());
    const { skews, onStale } = await run(SERVER_NOW);
    // The render stamp alone would put the server 10 minutes behind the device.
    near(skews[0], -10 * 60_000);
    // The fresh measurement says the clocks agree.
    near(skews[1], 0);
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it("flags a stale page on a device whose clock is also wrong", async () => {
    // Device 1 hour ahead, page 5 minutes old.
    const deviceNow = SERVER_NOW + 5 * 60_000 + 3_600_000;
    vi.setSystemTime(deviceNow);
    stubTimeRoute(() => SERVER_NOW + 5 * 60_000);
    const { skews, onStale } = await run(SERVER_NOW);
    near(skews[0], -(5 * 60_000 + 3_600_000));
    near(skews[1], -3_600_000);
    expect(onStale).toHaveBeenCalledTimes(1);
  });
});
