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
  type OwnerSalon,
  type Salon,
  type Service,
  type Stylist,
} from "@/lib/api";
import type { components } from "@/lib/api-types";
import { TOKEN_COOKIE } from "@/lib/auth/cookie";
import { safeNextPath } from "@/lib/auth/safe-next";
import { apiBaseUrl, fetchUpstream } from "@/lib/proxy/upstream";
import { matchesSalonName, normalizeSearch } from "@/lib/salon-search";

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

/** Cached per request so the search scan and the name suggestions share it. */
const getSalonBatch = cache((offset: number): Promise<Salon[]> => {
  return publicGet<Salon[]>(`/salons?limit=${MAX_LIST_LIMIT}&offset=${offset}`);
});

/**
 * Up to 100 distinct salon names (first batch, API order) for the search box
 * suggestions. Throws like any public read; the caller decides to ignore it.
 */
export async function getSalonNames(): Promise<string[]> {
  const batch = await getSalonBatch(0);
  const seen = new Set<string>();
  const names: string[] = [];
  for (const { name } of batch) {
    const label = name.trim();
    const key = normalizeSearch(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(label);
  }
  return names.slice(0, MAX_LIST_LIMIT);
}

// The API has no name search, so a search scans up to this many pages of 100.
const MAX_SEARCH_SCAN = 5;

/**
 * Salons whose name contains `query`, one page of them. The API cannot search,
 * so this reads salons 100 at a time (at most 500) and filters here. Replace
 * with a single call once the API accepts a name parameter.
 */
export async function searchSalons(
  query: string,
  page = 1,
): Promise<{ salons: Salon[]; hasNext: boolean; truncated: boolean }> {
  const matches: Salon[] = [];
  let truncated = false;
  for (let i = 0; i < MAX_SEARCH_SCAN; i++) {
    const batch = await getSalonBatch(i * MAX_LIST_LIMIT);
    for (const salon of batch) {
      if (matchesSalonName(salon.name, query)) matches.push(salon);
    }
    if (batch.length < MAX_LIST_LIMIT) break;
    truncated = i === MAX_SEARCH_SCAN - 1;
  }
  const start = (Math.max(1, page) - 1) * SALONS_PAGE_SIZE;
  return {
    salons: matches.slice(start, start + SALONS_PAGE_SIZE),
    hasNext: matches.length > start + SALONS_PAGE_SIZE,
    // Every page was full, so salons beyond the scan limit were not searched.
    truncated,
  };
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

/**
 * GET with the signed-in user's token from the cookie. Like publicGet, a
 * 502/503/504 answer (the free tier waking up) is retried once. Throws ApiError on
 * failure. `receivedAt` is our clock the moment the API's answer arrived (before
 * the body is read), the closest we can get to the API's own clock for working
 * out how much of a booking's hold is left.
 */
async function authedGet<T>(
  path: string,
): Promise<{ data: T; receivedAt: number }> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const base = apiBaseUrl();
  if (!token) throw new ApiError(401, "Please sign in again.");
  if (!base) throw new Error("API_URL is not set");

  const init = {
    method: "GET",
    headers: new Headers({
      accept: "application/json",
      authorization: `Bearer ${token}`,
    }),
  };
  let result = await fetchUpstream(`${base}${path}`, init);
  if (result.ok && WAKING_STATUSES.has(result.response.status)) {
    result = await fetchUpstream(`${base}${path}`, init);
  }
  if (!result.ok) {
    throw new ApiError(
      result.reason === "timeout" ? 504 : 502,
      UPSTREAM_DOWN_MESSAGE,
    );
  }
  const receivedAt = Date.now();
  const { response } = result;
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      messageFrom(body, "Something went wrong. Please try again."),
    );
  }
  return { data: (await response.json()) as T, receivedAt };
}

export type StylistAvailability = components["schemas"]["AvailabilityResponse"];

/**
 * The owner's salons with their moderation status, newest first as the API
 * returns them (up to 100). Throws ApiError: 403 (not an owner), 401 (signed out).
 */
export async function getMySalons(): Promise<OwnerSalon[]> {
  const { data } = await authedGet<OwnerSalon[]>(
    `/salons/mine?limit=${MAX_LIST_LIMIT}`,
  );
  return data;
}

/**
 * The owner's own salon services, read with their token. The public read is a
 * 404 while the salon is pending or suspended; the owner still sees theirs.
 */
export async function getOwnerSalonServices(id: string): Promise<Service[]> {
  const { data } = await authedGet<Service[]>(
    `/salons/${encodeURIComponent(id)}/services?limit=${MAX_LIST_LIMIT}`,
  );
  return data;
}

/** The owner's own salon stylists, read with their token (see above). */
export async function getOwnerSalonStylists(id: string): Promise<Stylist[]> {
  const { data } = await authedGet<Stylist[]>(
    `/salons/${encodeURIComponent(id)}/stylists?limit=${MAX_LIST_LIMIT}`,
  );
  return data;
}

/**
 * One stylist's weekly rules. Only the owner of the stylist's salon may read
 * them (403 otherwise).
 */
export async function getStylistAvailability(
  stylistId: string,
): Promise<StylistAvailability> {
  const { data } = await authedGet<StylistAvailability>(
    `/stylists/${encodeURIComponent(stylistId)}/availability`,
  );
  return data;
}

/**
 * One of the client's bookings for a server render, with the server's clock
 * so the browser can correct a wrong device clock when counting down the hold.
 * Throws ApiError: 403 (not yours), 404, 422 (bad id), 401 (signed out).
 */
export async function getMyBooking(
  id: string,
): Promise<{ booking: BookingDetail; serverNow: number }> {
  const { data, receivedAt } = await authedGet<BookingDetail>(
    `/bookings/${encodeURIComponent(id)}`,
  );
  return { booking: data, serverNow: receivedAt };
}

/**
 * The client's bookings, latest start first as the API returns them (up to
 * 100), with the server's clock for working out which holds are still running.
 */
export async function getMyBookings(): Promise<{
  bookings: BookingListItem[];
  serverNow: number;
}> {
  const { data, receivedAt } = await authedGet<BookingListItem[]>(
    "/bookings?limit=100",
  );
  return { bookings: data, serverNow: receivedAt };
}
