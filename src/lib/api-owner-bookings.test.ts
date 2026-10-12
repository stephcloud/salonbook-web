import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NO_OWNER_BOOKING_FILTERS,
  listSalonBookings,
  type OwnerBooking,
} from "@/lib/api";
import { json, routeFetch } from "@/tests/route-fetch";

const SALON = "11111111-1111-4111-8111-111111111111";
const LIST = `GET /api/proxy/salons/${SALON}/bookings`;

function rows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `b${i}`,
  })) as OwnerBooking[];
}

function query(mock: ReturnType<typeof routeFetch>["mock"]) {
  return new URLSearchParams(String(mock.mock.calls.at(-1)?.[0]).split("?")[1]);
}

afterEach(() => vi.unstubAllGlobals());

describe("listSalonBookings", () => {
  it("asks for 21 rows and returns only 20 with a next page", async () => {
    const { mock } = routeFetch({ [LIST]: () => json(rows(21)) });
    const result = await listSalonBookings(SALON, NO_OWNER_BOOKING_FILTERS, 1);

    expect(query(mock).get("limit")).toBe("21");
    expect(query(mock).get("offset")).toBe("0");
    expect(result.bookings).toHaveLength(20);
    expect(result.hasNext).toBe(true);
  });

  it("has no next page when 20 rows come back", async () => {
    routeFetch({ [LIST]: () => json(rows(20)) });
    const result = await listSalonBookings(SALON, NO_OWNER_BOOKING_FILTERS, 1);
    expect(result.bookings).toHaveLength(20);
    expect(result.hasNext).toBe(false);
  });

  it("moves the offset by 20 per page", async () => {
    const { mock } = routeFetch({ [LIST]: () => json(rows(1)) });
    await listSalonBookings(SALON, NO_OWNER_BOOKING_FILTERS, 3);
    expect(query(mock).get("offset")).toBe("40");
  });

  it("sends only the filters that are set", async () => {
    const { mock } = routeFetch({ [LIST]: () => json([]) });
    await listSalonBookings(SALON, NO_OWNER_BOOKING_FILTERS, 1);
    for (const key of ["status", "stylist_id", "from", "to"]) {
      expect(query(mock).has(key)).toBe(false);
    }

    await listSalonBookings(
      SALON,
      {
        status: "cancelled",
        stylistId: "st1",
        from: "2026-10-15",
        to: "2026-10-16",
      } as never,
      1,
    );
    const q = query(mock);
    expect(q.get("status")).toBe("cancelled");
    expect(q.get("stylist_id")).toBe("st1");
    expect(q.get("from")).toBe("2026-10-15");
    expect(q.get("to")).toBe("2026-10-16");
  });

  it("offers a next page on the last page inside the offset cap", async () => {
    const { mock } = routeFetch({ [LIST]: () => json(rows(21)) });
    const result = await listSalonBookings(
      SALON,
      NO_OWNER_BOOKING_FILTERS,
      500,
    );
    expect(query(mock).get("offset")).toBe("9980");
    expect(result.hasNext).toBe(true);
  });

  it("has no next page at the 10000 offset cap even with 21 rows", async () => {
    const { mock } = routeFetch({ [LIST]: () => json(rows(21)) });
    const result = await listSalonBookings(
      SALON,
      NO_OWNER_BOOKING_FILTERS,
      501,
    );
    expect(query(mock).get("offset")).toBe("10000");
    expect(result.bookings).toHaveLength(20);
    expect(result.hasNext).toBe(false);
  });
});
