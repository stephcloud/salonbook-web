import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OwnerSalon, Service, Stylist } from "@/lib/api";
import { buildChecklist } from "@/lib/setup-checklist";
import { SetupChecklist } from "./SetupChecklist";

const SALON_ID = "11111111-1111-4111-8111-111111111111";
const SALON = {
  id: SALON_ID,
  name: "Pink Studio",
  status: "approved",
} as OwnerSalon;
const SERVICE = { id: "s" } as Service;
const STYLIST = { id: "st" } as Stylist;

const WORKING = {
  stylist_id: "st",
  rules: [
    {
      id: "r",
      kind: "working" as const,
      weekday: 1,
      start_time: "09:00:00",
      end_time: "17:00:00",
      off_date: null,
    },
  ],
};

function renderChecklist(
  overrides: Partial<Parameters<typeof buildChecklist>[0]> = {},
) {
  const checklist = buildChecklist({
    salon: SALON,
    services: [],
    stylists: [],
    availability: { read: [], unchecked: 0 },
    ...overrides,
  });
  render(
    <SetupChecklist
      checklist={checklist}
      salonId={SALON_ID}
      salonStatus={overrides.salon?.status ?? SALON.status}
    />,
  );
}

describe("SetupChecklist", () => {
  it("shows six steps in an ordered list under a heading, with progress", () => {
    renderChecklist();
    expect(
      screen.getByRole("heading", { level: 2, name: "Set up your salon" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 of 5 set up")).toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual([
      "Step 1: Salon details",
      "Step 2: Add a service",
      "Step 3: Add a stylist",
      "Step 4: Set weekly hours",
      "Step 5: Salon approval",
      "Step 6: Share your link",
    ]);
  });

  it("writes the state of each step in words", () => {
    renderChecklist({ services: [SERVICE] });
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Done.");
    expect(items[1]).toHaveTextContent("Done. 1 service added.");
    expect(items[2]).toHaveTextContent("To do.");
    expect(items[3]).toHaveTextContent("Not yet. Add a stylist first");
    expect(items[4]).toHaveTextContent("Done. Your salon is live");
    expect(items[5]).toHaveTextContent("Not yet. Customers cannot book yet");
  });

  it("links steps 2 to 4 to the owner pages", () => {
    renderChecklist();
    expect(screen.getByRole("link", { name: "Add a service" })).toHaveAttribute(
      "href",
      "/dashboard/services",
    );
    expect(screen.getByRole("link", { name: "Add a stylist" })).toHaveAttribute(
      "href",
      "/dashboard/stylists",
    );
    expect(
      screen.getByRole("link", { name: "Set weekly hours" }),
    ).toHaveAttribute("href", "/dashboard/availability");
  });

  it("shows the public link, Copy and Preview in the share step even before the salon is ready", () => {
    renderChecklist();
    const share = screen.getAllByRole("listitem")[5];
    expect(within(share).getByText(`/salons/${SALON_ID}`)).toBeInTheDocument();
    expect(
      within(share).getByRole("button", { name: "Copy salon link" }),
    ).toBeInTheDocument();
    expect(
      within(share).getByRole("link", { name: "Preview as a customer" }),
    ).toHaveAttribute("href", `/salons/${SALON_ID}`);
  });

  it("says Ready to share once every setup step is done", () => {
    renderChecklist({
      services: [SERVICE],
      stylists: [STYLIST],
      availability: { read: [WORKING], unchecked: 0 },
    });
    expect(screen.getByText("5 of 5 set up")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")[5]).toHaveTextContent(
      "Ready to share.",
    );
  });

  it("shows the approval wait and a note on the link while pending", () => {
    renderChecklist({
      salon: { ...SALON, status: "pending" },
      services: [SERVICE],
      stylists: [STYLIST],
      availability: { read: [WORKING], unchecked: 0 },
    });
    expect(screen.getByText("4 of 5 set up")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items[4]).toHaveTextContent("Step 5: Salon approval");
    expect(items[4]).toHaveTextContent("Waiting for approval.");
    expect(items[4]).not.toHaveTextContent("To do.");
    expect(items[5]).toHaveTextContent(
      "Customers cannot book until your salon is approved.",
    );
    expect(items[5]).toHaveTextContent(
      "Customers who open this link will see “not found” until your salon is approved.",
    );
  });

  it("says Could not check when the hours could not be read", () => {
    renderChecklist({
      services: [SERVICE],
      stylists: [STYLIST],
      availability: { read: [], unchecked: 1 },
    });
    expect(screen.getAllByRole("listitem")[3]).toHaveTextContent(
      "Could not check.",
    );
  });
});
