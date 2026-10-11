// Single place for backend calls. On the server this talks to API_URL directly
// (see api-server.ts for the signed-in user and the public salon reads); in the browser everything
// goes through /api/proxy/* and /api/auth/* on our own domain.

import type { components } from "@/lib/api-types";
import { safeNextPath } from "@/lib/auth/safe-next";

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

export function messageFrom(body: unknown, fallback: string): string {
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

/**
 * The salon id in the path is missing or not a valid UUID (the API answers 404
 * or 422). This is the one place a 422 means "not found" rather than field
 * errors: these pages have no form, and the id comes from the URL.
 */
export function isMissingResource(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 404 || error.status === 422)
  );
}

export type Salon = components["schemas"]["SalonResponse"];
export type Service = components["schemas"]["ServiceResponse"];
export type Stylist = components["schemas"]["PublicStylistResponse"];

export const SALONS_PAGE_SIZE = 20;

export type Booking = components["schemas"]["BookingResponse"];
export type SlotsResponse = components["schemas"]["SlotsResponse"];
export type BookingInput = components["schemas"]["BookingCreate"];

/** Free start times for one stylist, service and day (browser, needs sign-in). */
export function getSlots(
  stylistId: string,
  serviceId: string,
  date: string,
): Promise<SlotsResponse> {
  const query = new URLSearchParams({ service_id: serviceId, date });
  return apiFetch<SlotsResponse>(
    `stylists/${encodeURIComponent(stylistId)}/slots?${query.toString()}`,
  );
}

/** Creates a pending booking. `starts_at` is a slot string exactly as the API gave it. */
export function createBooking(input: BookingInput): Promise<Booking> {
  return apiFetch<Booking>("bookings", { method: "POST", body: input });
}

export type BookingDetail =
  components["schemas"]["ClientBookingDetailResponse"];
export type BookingListItem = components["schemas"]["ClientBookingResponse"];
export type Payment = components["schemas"]["PaymentResponse"];

/** One of the signed-in client's bookings, with salon, service and payment info (browser). */
export function getBooking(id: string): Promise<BookingDetail> {
  return apiFetch<BookingDetail>(`bookings/${encodeURIComponent(id)}`);
}

/**
 * Starts (or re-reads) the deposit payment. The API answers again with the
 * same payment and Paystack link if called twice for the same booking.
 */
export function payBooking(id: string): Promise<Payment> {
  return apiFetch<Payment>(`bookings/${encodeURIComponent(id)}/pay`, {
    method: "POST",
  });
}

/**
 * The signed-in client's bookings (browser). The API sorts them by start time,
 * latest first, with no filters and no total, so the page filters and sorts
 * them itself.
 */
export function listBookings(
  limit = 100,
  offset = 0,
): Promise<BookingListItem[]> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiFetch<BookingListItem[]>(`bookings?${query.toString()}`);
}

/**
 * Cancels a booking. `refund_due` in the answer says whether the deposit comes
 * back. Cancelling again answers 200 with the same cancelled booking.
 */
export function cancelBooking(id: string): Promise<Booking> {
  return apiFetch<Booking>(`bookings/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
  });
}
