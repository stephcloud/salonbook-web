import { describe, expect, it } from "vitest";
import type { Salon, Service, Stylist } from "@/lib/api";
import { buildChecklist } from "./setup-checklist";

const SALON = { id: "salon-1", name: "Pink Studio" } as Salon;
const SERVICE = { id: "s1", name: "Braids" } as Service;
const STYLIST: Stylist = {
  id: "st1",
  name: "Ada",
  image_url: null,
  service_ids: [],
};

function steps(services: Service[], stylists: Stylist[]) {
  const checklist = buildChecklist({
    salon: SALON,
    services,
    stylists,
    availability: { read: [], unchecked: 0 },
  });
  return Object.fromEntries(checklist.steps.map((s) => [s.id, s.status]));
}

describe("setup checklist ticks from real service and stylist data", () => {
  it("has neither step done before anything is added", () => {
    expect(steps([], [])).toMatchObject({ service: "todo", stylist: "todo" });
  });

  it("ticks 'add a service' once a service exists", () => {
    expect(steps([SERVICE], [])).toMatchObject({
      service: "done",
      stylist: "todo",
    });
  });

  it("ticks 'add a stylist' once a stylist exists, even one with no services yet", () => {
    expect(steps([SERVICE], [STYLIST])).toMatchObject({
      service: "done",
      stylist: "done",
    });
    expect(steps([], [STYLIST])).toMatchObject({
      service: "todo",
      stylist: "done",
    });
  });

  it("goes back to 'to do' when the last service is deleted", () => {
    expect(steps([], [STYLIST]).service).toBe("todo");
  });
});
