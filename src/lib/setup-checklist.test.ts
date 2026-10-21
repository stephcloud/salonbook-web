import { describe, expect, it } from "vitest";
import type { OwnerSalon, Service, Stylist } from "@/lib/api";
import type { StylistAvailability } from "@/lib/api-server";
import { buildChecklist, type ChecklistInput } from "./setup-checklist";

const SALON = {
  id: "salon-1",
  name: "Pink Studio",
  status: "approved",
} as OwnerSalon;
const SERVICE = { id: "service-1" } as Service;
const STYLIST = { id: "stylist-1", name: "Ada" } as Stylist;

function availability(
  kinds: Array<"working" | "break" | "day_off">,
  id = "stylist-1",
): StylistAvailability {
  return {
    stylist_id: id,
    rules: kinds.map((kind, i) => ({
      id: `rule-${i}`,
      kind,
      weekday: kind === "day_off" ? null : 1,
      start_time: kind === "day_off" ? null : "09:00:00",
      end_time: kind === "day_off" ? null : "17:00:00",
      off_date: kind === "day_off" ? "2026-12-25" : null,
    })),
  };
}

function input(overrides: Partial<ChecklistInput> = {}): ChecklistInput {
  return {
    salon: SALON,
    services: [],
    stylists: [],
    availability: { read: [], unchecked: 0 },
    ...overrides,
  };
}

function statuses(checklist: ReturnType<typeof buildChecklist>) {
  return Object.fromEntries(checklist.steps.map((s) => [s.id, s.status]));
}

describe("buildChecklist", () => {
  it("lists the six steps in order", () => {
    expect(buildChecklist(input()).steps.map((s) => s.id)).toEqual([
      "salon",
      "service",
      "stylist",
      "hours",
      "approval",
      "share",
    ]);
  });

  it("a fresh salon: only the details are done", () => {
    const checklist = buildChecklist(input());
    expect(statuses(checklist)).toEqual({
      salon: "done",
      service: "todo",
      stylist: "todo",
      hours: "blocked",
      approval: "done",
      share: "blocked",
    });
    expect(checklist.progressText).toBe("2 of 5 set up");
    expect(checklist.readyForCustomers).toBe(false);
  });

  it("marks a service done only when the salon has one, and counts them", () => {
    const one = buildChecklist(input({ services: [SERVICE] }));
    expect(statuses(one).service).toBe("done");
    expect(one.steps[1].detail).toBe("1 service added.");
    const two = buildChecklist(input({ services: [SERVICE, SERVICE] }));
    expect(two.steps[1].detail).toBe("2 services added.");
  });

  it("marks a stylist done only when the salon has one, and counts them", () => {
    const one = buildChecklist(input({ stylists: [STYLIST] }));
    expect(statuses(one).stylist).toBe("done");
    expect(one.steps[2].detail).toBe("1 stylist added.");
    expect(
      buildChecklist(input({ stylists: [STYLIST, STYLIST] })).steps[2].detail,
    ).toBe("2 stylists added.");
  });

  describe("weekly hours", () => {
    it("is blocked until there is a stylist", () => {
      const step = buildChecklist(input()).steps[3];
      expect(step.status).toBe("blocked");
      expect(step.detail).toMatch(/add a stylist first/i);
    });

    it("is to do when stylists exist but have no working hours", () => {
      const checklist = buildChecklist(
        input({
          stylists: [STYLIST],
          availability: { read: [availability([])], unchecked: 0 },
        }),
      );
      expect(statuses(checklist).hours).toBe("todo");
    });

    it("does not count breaks or days off as working hours", () => {
      const checklist = buildChecklist(
        input({
          stylists: [STYLIST],
          availability: {
            read: [availability(["break", "day_off"])],
            unchecked: 0,
          },
        }),
      );
      expect(statuses(checklist).hours).toBe("todo");
    });

    it("is done when any stylist has a working rule", () => {
      const checklist = buildChecklist(
        input({
          stylists: [STYLIST, { ...STYLIST, id: "stylist-2" }],
          availability: {
            read: [availability([]), availability(["working"], "stylist-2")],
            unchecked: 0,
          },
        }),
      );
      expect(statuses(checklist).hours).toBe("done");
    });

    it("is unknown, never guessed as done, when the hours could not be read", () => {
      const checklist = buildChecklist(
        input({
          stylists: [STYLIST],
          availability: { read: [], unchecked: 1 },
        }),
      );
      expect(statuses(checklist).hours).toBe("unknown");
      expect(checklist.steps[3].detail).toMatch(/could not check/i);
      // Salon details, the stylist and the (approved) salon status.
      expect(checklist.doneCount).toBe(3);
    });

    it("is unknown when only some stylists could be read and none of those work", () => {
      const checklist = buildChecklist(
        input({
          stylists: [STYLIST, STYLIST],
          availability: { read: [availability([])], unchecked: 1 },
        }),
      );
      expect(statuses(checklist).hours).toBe("unknown");
    });

    it("is done when one stylist works even if another could not be read", () => {
      const checklist = buildChecklist(
        input({
          stylists: [STYLIST, STYLIST],
          availability: { read: [availability(["working"])], unchecked: 1 },
        }),
      );
      expect(statuses(checklist).hours).toBe("done");
    });
  });

  describe("share your link", () => {
    it("is never done, and is ready only once steps 1 to 5 are done", () => {
      const checklist = buildChecklist(
        input({
          services: [SERVICE],
          stylists: [STYLIST],
          availability: { read: [availability(["working"])], unchecked: 0 },
        }),
      );
      expect(statuses(checklist)).toEqual({
        salon: "done",
        service: "done",
        stylist: "done",
        hours: "done",
        approval: "done",
        share: "ready",
      });
      expect(checklist.progressText).toBe("5 of 5 set up");
      expect(checklist.readyForCustomers).toBe(true);
    });

    it.each([
      ["no service", { stylists: [STYLIST] }],
      ["no stylist", { services: [SERVICE] }],
    ])("says customers cannot book yet with %s", (_name, overrides) => {
      const checklist = buildChecklist(input(overrides));
      const share = checklist.steps[5];
      expect(share.status).toBe("blocked");
      expect(share.detail).toMatch(/cannot book yet/i);
      expect(checklist.readyForCustomers).toBe(false);
    });

    it("is not ready when the hours are unknown", () => {
      const checklist = buildChecklist(
        input({
          services: [SERVICE],
          stylists: [STYLIST],
          availability: { read: [], unchecked: 1 },
        }),
      );
      expect(checklist.steps[5].status).toBe("blocked");
      expect(checklist.progressText).toBe("4 of 5 set up");
    });
  });

  it("links steps 2 to 4 to the owner pages and leaves 1, 5 and 6 without a link", () => {
    const hrefs = Object.fromEntries(
      buildChecklist(input()).steps.map((s) => [s.id, s.href]),
    );
    expect(hrefs).toEqual({
      salon: null,
      service: "/dashboard/services",
      stylist: "/dashboard/stylists",
      hours: "/dashboard/availability",
      approval: null,
      share: null,
    });
  });

  describe("approval", () => {
    const allSetUp = {
      services: [SERVICE],
      stylists: [STYLIST],
      availability: { read: [availability(["working"])], unchecked: 0 },
    };

    it.each([
      ["pending", "waiting", /until it's approved/],
      ["suspended", "paused", /bookings are paused/],
      ["approved", "done", /Your salon is live/],
    ] as const)(
      "a %s salon's approval step is %s",
      (status, stepStatus, detail) => {
        const checklist = buildChecklist(
          input({ ...allSetUp, salon: { ...SALON, status } }),
        );
        const step = checklist.steps[4];
        expect(step.id).toBe("approval");
        expect(step.title).toBe("Salon approval");
        expect(step.status).toBe(stepStatus);
        expect(step.detail).toMatch(detail);
        expect(step.href).toBeNull();
      },
    );

    it("keeps the share step blocked until the salon is approved", () => {
      const pending = buildChecklist(
        input({ ...allSetUp, salon: { ...SALON, status: "pending" } }),
      );
      expect(pending.progressText).toBe("4 of 5 set up");
      expect(pending.readyForCustomers).toBe(false);
      expect(pending.steps[5].status).toBe("blocked");
      expect(pending.steps[5].detail).toBe(
        "Customers cannot book until your salon is approved.",
      );
    });

    it("says customers cannot book while suspended", () => {
      const suspended = buildChecklist(
        input({ ...allSetUp, salon: { ...SALON, status: "suspended" } }),
      );
      expect(suspended.steps[5].detail).toBe(
        "Customers cannot book while your salon is suspended.",
      );
    });

    it("asks for the setup steps first when those are missing too", () => {
      const pending = buildChecklist(
        input({ salon: { ...SALON, status: "pending" } }),
      );
      expect(pending.progressText).toBe("1 of 5 set up");
      expect(pending.steps[5].detail).toMatch(/Finish the steps above first/);
    });
  });

  it("changes the action wording once a step is done", () => {
    const fresh = buildChecklist(input());
    expect(fresh.steps[1].actionLabel).toBe("Add a service");
    const done = buildChecklist(input({ services: [SERVICE] }));
    expect(done.steps[1].actionLabel).toBe("Manage services");
  });
});
