// Single place for backend calls. On the server this talks to API_URL directly
// (see api-server.ts for the signed-in user and the public salon reads); in the browser everything
// goes through /api/proxy/* and /api/auth/* on our own domain.

import type { components } from "@/lib/api-types";
import { safeNextPath } from "@/lib/auth/safe-next";

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: FieldErrors = {},
    /** The raw `detail` of a 422, for callers that need the whole `loc` path (such as a row index). */
    public readonly detail: unknown = undefined,
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
    res.status === 422 ? detail : undefined,
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
/** What an owner sees of their own salon: the public fields plus its moderation status. */
export type OwnerSalon = components["schemas"]["OwnerSalonResponse"];
export type SalonStatus = components["schemas"]["SalonStatus"];
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

export type OwnerBooking = components["schemas"]["OwnerBookingItem"];
export type BookingStatus = components["schemas"]["BookingStatus"];

/** Bookings shown per page on the owner's list. */
export const OWNER_BOOKINGS_PAGE_SIZE = 20;
/** The API's largest `offset`. */
export const OWNER_BOOKINGS_MAX_OFFSET = 10_000;

export type OwnerBookingFilters = {
  /** "" means any status. */
  status: BookingStatus | "";
  /** "" means any stylist. */
  stylistId: string;
  /** Lagos calendar day "YYYY-MM-DD", inclusive; "" means no limit. */
  from: string;
  to: string;
};

export const NO_OWNER_BOOKING_FILTERS: OwnerBookingFilters = {
  status: "",
  stylistId: "",
  from: "",
  to: "",
};

/**
 * One page (1-based) of a salon's bookings for its owner (browser). The API
 * sorts by start time, earliest first, and sends no total, so one extra row is
 * asked for: when it comes back there is a next page. `from` and `to` are
 * Lagos calendar days, both inclusive (checked against the live API).
 * Throws ApiError: 403 (not this salon's owner), 401 (signed out), 422.
 */
export async function listSalonBookings(
  salonId: string,
  filters: OwnerBookingFilters,
  page: number,
): Promise<{ bookings: OwnerBooking[]; hasNext: boolean }> {
  const query = new URLSearchParams({
    limit: String(OWNER_BOOKINGS_PAGE_SIZE + 1),
    offset: String((page - 1) * OWNER_BOOKINGS_PAGE_SIZE),
  });
  if (filters.status) query.set("status", filters.status);
  if (filters.stylistId) query.set("stylist_id", filters.stylistId);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  const rows = await apiFetch<OwnerBooking[]>(
    `salons/${encodeURIComponent(salonId)}/bookings?${query.toString()}`,
  );
  return {
    bookings: rows.slice(0, OWNER_BOOKINGS_PAGE_SIZE),
    hasNext:
      rows.length > OWNER_BOOKINGS_PAGE_SIZE &&
      page * OWNER_BOOKINGS_PAGE_SIZE <= OWNER_BOOKINGS_MAX_OFFSET,
  };
}

export type SalonInput = components["schemas"]["SalonCreate"];
export type SalonUpdate = components["schemas"]["SalonUpdate"];

/** Creates a salon owned by the signed-in owner (browser). 403 for a client. */
export function createSalon(input: SalonInput): Promise<Salon> {
  return apiFetch<Salon>("salons", { method: "POST", body: input });
}

/**
 * Edits one of the owner's salons (browser). Send only what changed; an
 * explicit `image_url: null` clears the image.
 */
export function updateSalon(id: string, input: SalonUpdate): Promise<Salon> {
  return apiFetch<Salon>(`salons/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export type ServiceInput = components["schemas"]["ServiceCreate"];
export type ServiceUpdate = components["schemas"]["ServiceUpdate"];
export type StylistServices = components["schemas"]["StylistServicesResponse"];

// The API's biggest page; a salon will not come close in the MVP.
const LIST_LIMIT = 100;

/** A salon's services (browser, public read). */
export function listSalonServices(salonId: string): Promise<Service[]> {
  return apiFetch<Service[]>(
    `salons/${encodeURIComponent(salonId)}/services?limit=${LIST_LIMIT}`,
  );
}

/** A salon's stylists with their service ids (browser, public read). */
export function listSalonStylists(salonId: string): Promise<Stylist[]> {
  return apiFetch<Stylist[]>(
    `salons/${encodeURIComponent(salonId)}/stylists?limit=${LIST_LIMIT}`,
  );
}

/** Adds a service to one of the owner's salons (browser). */
export function createService(
  salonId: string,
  input: ServiceInput,
): Promise<Service> {
  return apiFetch<Service>(`salons/${encodeURIComponent(salonId)}/services`, {
    method: "POST",
    body: input,
  });
}

/** Edits a service (browser). Send only what changed. */
export function updateService(
  id: string,
  input: ServiceUpdate,
): Promise<Service> {
  return apiFetch<Service>(`services/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

/** Deletes a service (browser). The API refuses when it has bookings. */
export function deleteService(id: string): Promise<void> {
  return apiFetch<void>(`services/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** Replaces the set of services a stylist offers (browser). */
export function setStylistServices(
  stylistId: string,
  serviceIds: string[],
): Promise<StylistServices> {
  return apiFetch<StylistServices>(
    `stylists/${encodeURIComponent(stylistId)}/services`,
    { method: "PUT", body: { service_ids: serviceIds } },
  );
}

export type AvailabilityRule =
  components["schemas"]["AvailabilityRuleResponse"];
export type AvailabilityRuleInput =
  components["schemas"]["AvailabilityRuleInput"];
export type Availability = components["schemas"]["AvailabilityResponse"];

/** One stylist's weekly hours, breaks and days off (browser). Owner of that salon only. */
export function getAvailability(stylistId: string): Promise<Availability> {
  return apiFetch<Availability>(
    `stylists/${encodeURIComponent(stylistId)}/availability`,
  );
}

/**
 * Replaces ALL of a stylist's rules (hours, breaks and days off together) with
 * exactly these (browser). Anything not sent is deleted.
 */
export function setAvailability(
  stylistId: string,
  rules: AvailabilityRuleInput[],
): Promise<Availability> {
  return apiFetch<Availability>(
    `stylists/${encodeURIComponent(stylistId)}/availability`,
    { method: "PUT", body: { rules } },
  );
}

/** What our own route handler returns for a new stylist. */
export type CreatedStylist = {
  id: string;
  name: string;
  image_url: string | null;
};

/**
 * Adds a stylist through /api/dashboard/stylists. The API wants an email and
 * a password for every stylist; that handler makes throw-away ones on the
 * server, so the browser never sees or sends them.
 */
export function createStylist(input: {
  salon_id: string;
  name: string;
  image_url?: string;
}): Promise<CreatedStylist> {
  return request<CreatedStylist>(
    "/api/dashboard/stylists",
    { method: "POST", body: input },
    true,
  );
}

/**
 * A measurement taking longer than this is too uncertain to use: the server
 * read its clock somewhere in the round trip, so the midpoint can be wrong by
 * half of it (1 second at this limit).
 */
const MAX_CLOCK_ROUND_TRIP_MS = 2000;

/**
 * Measures how far this device's clock is from our server's, as "server time
 * minus device time" in milliseconds, or null when it cannot be measured (no
 * network, or the round trip was too slow to trust). The server read its clock
 * about halfway through the round trip.
 */
export async function fetchClockSkew(): Promise<number | null> {
  try {
    const sentAt = Date.now();
    const response = await fetch("/api/time", { cache: "no-store" });
    const receivedAt = Date.now();
    if (!response.ok) return null;
    if (receivedAt - sentAt > MAX_CLOCK_ROUND_TRIP_MS) return null;
    const body: unknown = await response.json();
    const now =
      body && typeof body === "object"
        ? (body as { now?: unknown }).now
        : undefined;
    if (typeof now !== "number" || !Number.isFinite(now)) return null;
    return now - (sentAt + receivedAt) / 2;
  } catch {
    return null;
  }
}
