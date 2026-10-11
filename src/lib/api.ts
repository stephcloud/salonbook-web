// Single place for backend calls. On the server this talks to API_URL directly
// (see also api-server.ts for the signed-in user); in the browser everything
// goes through /api/proxy/* and /api/auth/* on our own domain.

import type { components } from "@/lib/api-types";
import { safeNextPath } from "@/lib/auth/safe-next";
import { apiBaseUrl, fetchUpstream } from "@/lib/proxy/upstream";

const ATTEMPT_TIMEOUT_MS = 30_000;

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Turns FastAPI's 422 `detail` array into { fieldName: message }. The field
 * is the last part of `loc` (["body", "email"] -> "email"); the first message
 * for a field wins.
 */
export function parseFieldErrors(detail: unknown): FieldErrors {
  const out: FieldErrors = {};
  if (!Array.isArray(detail)) return out;
  for (const item of detail) {
    if (!item || typeof item !== "object") continue;
    const { loc, msg } = item as { loc?: unknown; msg?: unknown };
    if (!Array.isArray(loc) || typeof msg !== "string") continue;
    const field = loc[loc.length - 1];
    if (typeof field === "string" && !(field in out)) out[field] = msg;
  }
  return out;
}

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const { error, detail } = body as { error?: unknown; detail?: unknown };
    if (typeof error === "string") return error;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

async function request<T>(
  url: string,
  init: { method?: string; body?: unknown },
  redirectOn401: boolean,
): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(url, {
    method: init.method ?? (hasBody ? "POST" : "GET"),
    headers: {
      accept: "application/json",
      ...(hasBody ? { "content-type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
  });

  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);

  if (res.ok) return body as T;

  if (res.status === 401 && redirectOn401) {
    const here = safeNextPath(
      window.location.pathname + window.location.search,
    );
    window.location.assign(
      here ? `/login?next=${encodeURIComponent(here)}` : "/login",
    );
  }

  const detail =
    body && typeof body === "object"
      ? (body as { detail?: unknown }).detail
      : undefined;
  throw new ApiError(
    res.status,
    messageFrom(body, "Something went wrong. Please try again."),
    res.status === 422 ? parseFieldErrors(detail) : {},
  );
}

/** Browser call to the backend via our proxy. A 401 sends the user to /login. */
export function apiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  return request<T>(`/api/proxy/${path.replace(/^\/+/, "")}`, init, true);
}

/** Browser call to our own /api/auth/* handlers. A 401 here means wrong password. */
export function authFetch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(`/api/auth/${path}`, { method: "POST", body }, false);
}

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

export type Salon = components["schemas"]["SalonResponse"];
export type Service = components["schemas"]["ServiceResponse"];
export type Stylist = components["schemas"]["PublicStylistResponse"];

export const SALONS_PAGE_SIZE = 20;
const MAX_LIST_LIMIT = 100;

/**
 * Server-side GET for the public endpoints (no token). fetchUpstream retries
 * once, which covers the free tier waking up. Throws ApiError on failure.
 */
async function publicGet<T>(path: string): Promise<T> {
  const base = apiBaseUrl();
  if (!base) throw new Error("API_URL is not set");

  const result = await fetchUpstream(`${base}${path}`, {
    method: "GET",
    headers: new Headers({ accept: "application/json" }),
  });
  if (!result.ok) {
    throw new ApiError(
      result.reason === "timeout" ? 504 : 502,
      "The server is not responding right now. It may be waking up, please try again in a moment.",
    );
  }

  const { response } = result;
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      messageFrom(body, "Something went wrong. Please try again."),
    );
  }
  return (await response.json()) as T;
}

/** Not found, or an id that is not a valid UUID (the API answers 404 or 422). */
export function isNotFound(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 404 || error.status === 422)
  );
}

export function getSalons(page = 1): Promise<Salon[]> {
  const offset = (Math.max(1, page) - 1) * SALONS_PAGE_SIZE;
  return publicGet<Salon[]>(
    `/salons?limit=${SALONS_PAGE_SIZE}&offset=${offset}`,
  );
}

export function getSalon(id: string): Promise<Salon> {
  return publicGet<Salon>(`/salons/${encodeURIComponent(id)}`);
}

export function getSalonServices(id: string): Promise<Service[]> {
  return publicGet<Service[]>(
    `/salons/${encodeURIComponent(id)}/services?limit=${MAX_LIST_LIMIT}`,
  );
}

export function getSalonStylists(id: string): Promise<Stylist[]> {
  return publicGet<Stylist[]>(
    `/salons/${encodeURIComponent(id)}/stylists?limit=${MAX_LIST_LIMIT}`,
  );
}
