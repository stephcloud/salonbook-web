import { render, screen } from "@testing-library/react";
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Salon, Stylist } from "@/lib/api";

const getOwnerSalonStylists = vi.fn();
const getStylistAvailability = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getOwnerSalonStylists: (id: string) => getOwnerSalonStylists(id),
  getStylistAvailability: (id: string) => getStylistAvailability(id),
}));

vi.mock("@/components/features/dashboard/OwnerSalonPage", () => ({
  OwnerSalonPage: (props: Record<string, unknown>) => props,
}));

const sectionProps = vi.fn();
vi.mock(
  "@/components/features/dashboard/availability/AvailabilitySection",
  () => ({
    AvailabilitySection: (props: unknown) => {
      sectionProps(props);
      return <p>availability section</p>;
    },
  }),
);

import AvailabilityPage, { dynamic } from "./page";

const SALON = { id: "salon-1", name: "Pink Studio" } as Salon;
const ADA = { id: "sty-1", name: "Ada" } as Stylist;
const BEA = { id: "sty-2", name: "Bea" } as Stylist;
const RULES = { stylist_id: "sty-1", rules: [] };

type FrameProps = {
  path: string;
  title: string;
  children: (salon: Salon) => Promise<ReactNode>;
};

function frame() {
  return (AvailabilityPage() as { props: FrameProps }).props;
}

beforeEach(() => {
  vi.clearAllMocks();
  getOwnerSalonStylists.mockResolvedValue([ADA, BEA]);
  getStylistAvailability.mockResolvedValue(RULES);
});

describe("AvailabilityPage", () => {
  it("is never prerendered", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("uses the owner frame (sign-in and owners-only gating) for /dashboard/availability", () => {
    const element = AvailabilityPage();
    expect(isValidElement(element)).toBe(true);
    expect(frame().path).toBe("/dashboard/availability");
    expect(frame().title).toBe("Weekly hours");
  });

  it("reads the stylists and the first stylist's hours on the server", async () => {
    render(<>{await frame().children(SALON)}</>);
    expect(getOwnerSalonStylists).toHaveBeenCalledWith("salon-1");
    expect(getStylistAvailability).toHaveBeenCalledTimes(1);
    expect(getStylistAvailability).toHaveBeenCalledWith("sty-1");
    expect(sectionProps).toHaveBeenCalledWith({
      stylists: [ADA, BEA],
      initialAvailability: RULES,
    });
    expect(screen.getByText("availability section")).toBeInTheDocument();
  });

  it("hands over null when that read fails, so the section can retry it", async () => {
    getStylistAvailability.mockRejectedValue(new Error("asleep"));
    render(<>{await frame().children(SALON)}</>);
    expect(sectionProps).toHaveBeenCalledWith({
      stylists: [ADA, BEA],
      initialAvailability: null,
    });
  });

  it("reads no hours for a salon without stylists", async () => {
    getOwnerSalonStylists.mockResolvedValue([]);
    render(<>{await frame().children(SALON)}</>);
    expect(getStylistAvailability).not.toHaveBeenCalled();
    expect(sectionProps).toHaveBeenCalledWith({
      stylists: [],
      initialAvailability: null,
    });
  });

  it("lets a failing stylist list reach the error page", async () => {
    getOwnerSalonStylists.mockRejectedValue(new Error("down"));
    await expect(frame().children(SALON)).rejects.toThrow("down");
  });
});
