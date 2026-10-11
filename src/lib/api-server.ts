import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ApiError,
  SALONS_PAGE_SIZE,
  messageFrom,
  type BookingDetail,
  type BookingListItem,
  type Salon,
  type Service,
  type Stylist,
} from "@/lib/api";
import type { components } from "@/lib/api-types";
import { TOKEN_COOKIE } from "@/lib/auth/cookie";
import { safeNextPath } from "@/lib/auth/safe-next";
import { apiBaseUrl, fetchUpstream } from "@/lib/proxy/upstream";

export type CurrentUser = components["schemas"]["UserResponse"];

/**
 * The signed-in user from GET /auth/me, or null when there is no cookie or the
 * token is no longer valid. Reading cookies makes the calling page dynamic.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const base = apiBaseUrl();
  if (!token || !base) return null;

  const result = await fetchUpstream(`${base}/auth/me`, {
    method: "GET",
    headers: new Headers({
      accept: "application/json",
      authorization: `Bearer ${token}`,
    }),
  });
  // Only a rejected token means "signed out". An outage must not bounce
  // signed-in users to /login, so it throws and app/error.tsx offers a retry.
  if (!result.ok) throw new Error("The server is not responding.");
  const { status } = result.response;
  if (status === 401 || status === 403) return null;
  if (!result.response.ok) throw new Error("Could not load your account.");
  return (await result.response.json()) as CurrentUser;
});

export function loginRedirectUrl(next: string): string {
  const safe = safeNextPath(next);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}

/** For pages that need a signed-in user: redirects to /login?next= otherwise. */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginRedirectUrl(next));
  return user;
}

// Lists are capped at the API maximum; a salon will not come close in the MVP.
const MAX_LIST_LIMIT = 100;
const WAKING_STATUSES = new Set([502, 503, 504]);

/**
 * GET for the public endpoints (no token). fetchUpstream retries network
 * failures and timeouts once; a 502/503/504 answer (the free tier waking up)
 * is retried once here. Throws ApiError on failure.
 */
async function publicGet<T>(path: string): Promise<T> {
  const base = apiBaseUrl();
  if (!base) throw new Error("API_URL is not set");

  const init = {
    method: "GET",
    headers: new Headers({ accept: "application/json" }),
  };
  let result = await fetchUpstream(`${base}${path}`, init);
  if (result.ok && WAKING_STATUSES.has(result.response.status)) {
    result = await fetchUpstream(`${base}${path}`, init);
  }

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

export function getSalons(page = 1): Promise<Salon[]> {
  const offset = (Math.max(1, page) - 1) * SALONS_PAGE_SIZE;
  return publicGet<Salon[]>(
    `/salons?limit=${SALONS_PAGE_SIZE}&offset=${offset}`,
  );
}

/** Cached per request so the page and its metadata share one call. */
export const getSalon = cache((id: string): Promise<Salon> => {
  return publicGet<Salon>(`/salons/${encodeURIComponent(id)}`);
});

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

const UPSTREAM_DOWN_MESSAGE =
  "The server is not responding right now. It may be waking up, please try again in a moment.";

/** GET with the signed-in user's token from the cookie. Throws ApiError on failure. */
async function authedGet<T>(path: string): Promise<T> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const base = apiBaseUrl();
  if (!token) throw new ApiError(401, "Please sign in again.");
  if (!base) throw new Error("API_URL is not set");

  const result = await fetchUpstream(`${base}${path}`, {
    method: "GET",
    headers: new Headers({
      accept: "application/json",
      authorization: `Bearer ${token}`,
    }),
  });
  if (!result.ok) {
    throw new ApiError(
      result.reason === "timeout" ? 504 : 502,
      UPSTREAM_DOWN_MESSAGE,
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

/**
 * One of the client's bookings for a server render, with the server's clock
 * so the browser can correct a wrong device clock when counting down the hold.
 * Throws ApiError: 403 (not yours), 404, 422 (bad id), 401 (signed out).
 */
export async function getMyBooking(
  id: string,
): Promise<{ booking: BookingDetail; serverNow: number }> {
  const booking = await authedGet<BookingDetail>(
    `/bookings/${encodeURIComponent(id)}`,
  );
  return { booking, serverNow: Date.now() };
}

/**
 * The client's bookings, newest first as the API returns them (up to 100),
 * with the server's clock for working out which holds are still running.
 */
export async function getMyBookings(): Promise<{
  bookings: BookingListItem[];
  serverNow: number;
}> {
  const bookings = await authedGet<BookingListItem[]>("/bookings?limit=100");
  return { bookings, serverNow: Date.now() };
}
