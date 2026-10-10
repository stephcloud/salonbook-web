const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "PUT", "DELETE"]);

// The free tier can need about 50 seconds to wake up. Idempotent calls get a
// shorter attempt and a second try; others get one long attempt and are never
// replayed, so a slow or reset POST cannot be applied twice.
const IDEMPOTENT_TIMEOUT_MS = 40_000;
const SINGLE_TIMEOUT_MS = 90_000;

export type UpstreamResult =
  | { ok: true; response: Response }
  | { ok: false; reason: "timeout" | "unreachable" };

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

export async function fetchUpstream(
  url: string,
  init: { method: string; headers: Headers; body?: string | ArrayBuffer },
): Promise<UpstreamResult> {
  const idempotent = IDEMPOTENT_METHODS.has(init.method);
  const timeoutMs = idempotent ? IDEMPOTENT_TIMEOUT_MS : SINGLE_TIMEOUT_MS;

  let lastReason: "timeout" | "unreachable" = "unreachable";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
      return { ok: true, response };
    } catch (error) {
      const timedOut = isTimeout(error);
      lastReason = timedOut ? "timeout" : "unreachable";
      // Never replay a POST/PATCH: a reset after sending could apply it twice.
      if (!idempotent) break;
    }
  }
  return { ok: false, reason: lastReason };
}

export function upstreamErrorResponse(
  reason: "timeout" | "unreachable",
): Response {
  return Response.json(
    {
      error:
        "The server is not responding right now. It may be waking up, please try again in a moment.",
    },
    { status: reason === "timeout" ? 504 : 502 },
  );
}

export function apiBaseUrl(): string | null {
  const url = process.env.API_URL;
  return url ? url.replace(/\/+$/, "") : null;
}
