import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Our server's clock in milliseconds. The browser asks for it to work out how
 * far its own clock is from ours, so a hold countdown stays right on a device
 * with a wrong clock and on a page restored from the browser's cache. It holds
 * no data and needs no sign-in.
 */
export function GET() {
  return NextResponse.json(
    { now: Date.now() },
    { headers: { "cache-control": "no-store" } },
  );
}
