// Single place for backend calls. Server side only for now: the browser will
// call /api/proxy/* once the route handlers exist.

const ATTEMPT_TIMEOUT_MS = 30_000;

export type HealthResult = { ok: true } | { ok: false; message: string };

function apiOrigin(): string {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error("API_URL is not set");
  }
  return new URL(apiUrl).origin;
}

async function checkOnce(origin: string): Promise<HealthResult> {
  try {
    const res = await fetch(`${origin}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `The API answered with status ${res.status}.`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "The API did not respond in time." };
  }
}

/**
 * GET /health lives at the API origin, not under /api/v1. The free tier can
 * take about 50 seconds to wake up, so a failed first attempt is retried once.
 */
export async function getHealth(): Promise<HealthResult> {
  let origin: string;
  try {
    origin = apiOrigin();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Invalid API_URL",
    };
  }

  const first = await checkOnce(origin);
  return first.ok ? first : checkOnce(origin);
}
