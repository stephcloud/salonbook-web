import { describe, expect, it } from "vitest";
import type { BookingListItem } from "@/lib/api";
import { bookingTab, splitBookings } from "./booking-tabs";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const NOW = Date.parse("2026-10-11T12:00:00Z");

const iso = (ms: number) => new Date(ms).toISOString();

type Input = Pick<
  BookingListItem,
  "status" | "starts_at" | "ends_at" | "cancelled_at" | "created_at"
> & { id?: string };

/** A booking that starts `startsInMs` from NOW and lasts an hour, created `createdAgoMs` ago. */
function booking(
  status: BookingListItem["status"],
  {
    startsInMs = 24 * HOUR,
    createdAgoMs = 0,
    cancelledAt = null as string | null,
  } = {},
): Input {
  return {
    status,
    starts_at: iso(NOW + startsInMs),
    ends_at: iso(NOW + startsInMs + HOUR),
    cancelled_at: cancelledAt,
    created_at: iso(NOW - createdAgoMs),
  };
}

describe("bookingTab", () => {
  describe("pending", () => {
    it("is Upcoming while the 15-minute hold is running", () => {
      expect(
        bookingTab(booking("pending", { createdAgoMs: 5 * MINUTE }), NOW),
      ).toBe("upcoming");
      expect(
        bookingTab(booking("pending", { createdAgoMs: 15 * MINUTE - 1 }), NOW),
      ).toBe("upcoming");
    });

    it("is Past the moment the hold ends (expired)", () => {
      expect(
        bookingTab(booking("pending", { createdAgoMs: 15 * MINUTE }), NOW),
      ).toBe("past");
      expect(
        bookingTab(booking("pending", { createdAgoMs: 40 * MINUTE }), NOW),
      ).toBe("past");
    });
  });

  describe("confirmed", () => {
    it("is Upcoming before it starts", () => {
      expect(
        bookingTab(booking("confirmed", { startsInMs: 2 * HOUR }), NOW),
      ).toBe("upcoming");
    });

    it("is still Upcoming while it is under way", () => {
      expect(
        bookingTab(booking("confirmed", { startsInMs: -30 * MINUTE }), NOW),
      ).toBe("upcoming");
    });

    it("is Past exactly when it ends, and after", () => {
      expect(bookingTab(booking("confirmed", { startsInMs: -HOUR }), NOW)).toBe(
        "past",
      );
      expect(
        bookingTab(booking("confirmed", { startsInMs: -3 * HOUR }), NOW),
      ).toBe("past");
    });
  });

  describe("closed bookings are always Past", () => {
    it.each(["cancelled", "completed", "no_show"] as const)(
      "%s, even for a time in the future",
      (status) => {
        expect(
          bookingTab(booking(status, { startsInMs: 48 * HOUR }), NOW),
        ).toBe("past");
      },
    );

    it("an expired hold the API cancelled by itself (no cancelled_at) is Past", () => {
      expect(bookingTab(booking("cancelled", { cancelledAt: null }), NOW)).toBe(
        "past",
      );
    });

    it("a booking the client cancelled is Past", () => {
      expect(
        bookingTab(booking("cancelled", { cancelledAt: iso(NOW - HOUR) }), NOW),
      ).toBe("past");
    });
  });
});

describe("splitBookings", () => {
  it("puts bookings in the right tab and keeps every booking exactly once", () => {
    const list = [
      { ...booking("confirmed", { startsInMs: 3 * HOUR }), id: "soon" },
      { ...booking("pending", { createdAgoMs: 2 * MINUTE }), id: "held" },
      { ...booking("pending", { createdAgoMs: 30 * MINUTE }), id: "expired" },
      { ...booking("cancelled", { startsInMs: 5 * HOUR }), id: "cancelled" },
      { ...booking("confirmed", { startsInMs: -5 * HOUR }), id: "done" },
    ];
    const { upcoming, past } = split(list);
    expect(upcoming.map((b) => b.id).sort()).toEqual(["held", "soon"]);
    expect(past.map((b) => b.id).sort()).toEqual([
      "cancelled",
      "done",
      "expired",
    ]);
    expect(upcoming.length + past.length).toBe(list.length);
  });

  it("sorts Upcoming soonest first and Past most recent first", () => {
    const list = [
      { ...booking("confirmed", { startsInMs: 72 * HOUR }), id: "c" },
      { ...booking("confirmed", { startsInMs: 2 * HOUR }), id: "a" },
      { ...booking("confirmed", { startsInMs: 30 * HOUR }), id: "b" },
      { ...booking("cancelled", { startsInMs: -10 * HOUR }), id: "p1" },
      { ...booking("cancelled", { startsInMs: -2 * HOUR }), id: "p2" },
      { ...booking("completed", { startsInMs: -50 * HOUR }), id: "p3" },
    ];
    const { upcoming, past } = split(list);
    expect(upcoming.map((b) => b.id)).toEqual(["a", "b", "c"]);
    expect(past.map((b) => b.id)).toEqual(["p2", "p1", "p3"]);
  });

  it("returns two empty lists for no bookings", () => {
    expect(splitBookings([], NOW)).toEqual({ upcoming: [], past: [] });
  });

  it("does not change the list it was given", () => {
    const list = [
      { ...booking("confirmed", { startsInMs: 5 * HOUR }), id: "b" },
      { ...booking("confirmed", { startsInMs: 1 * HOUR }), id: "a" },
    ];
    const copy = [...list];
    split(list);
    expect(list).toEqual(copy);
  });
});

function split<T extends Input>(list: T[]) {
  return splitBookings(list, NOW);
}
