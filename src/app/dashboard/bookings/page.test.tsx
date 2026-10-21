import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Salon, Service, Stylist } from "@/lib/api";

const getOwnerSalonServices = vi.fn();
const getOwnerSalonStylists = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getOwnerSalonServices: (id: string) => getOwnerSalonServices(id),
  getOwnerSalonStylists: (id: string) => getOwnerSalonStylists(id),
}));

vi.mock("@/components/features/dashboard/OwnerSalonPage", () => ({
  OwnerSalonPage: (props: Record<string, unknown>) => props,
}));

vi.mock(
  "@/components/features/dashboard/bookings/OwnerBookingsSection",
  () => ({
    OwnerBookingsSection: () => null,
  }),
);

import OwnerBookingsPage, { dynamic } from "./page";

const SALON = { id: "salon-1", deposit_amount: 500000 } as Salon;
const SERVICES = [{ id: "svc-1" }] as Service[];
const STYLISTS = [{ id: "sty-1" }] as Stylist[];

type FrameProps = {
  path: string;
  children: (salon: Salon) => Promise<ReactNode>;
};

beforeEach(() => {
  vi.clearAllMocks();
  getOwnerSalonServices.mockResolvedValue(SERVICES);
  getOwnerSalonStylists.mockResolvedValue(STYLISTS);
});

describe("owner bookings page", () => {
  it("is dynamic, so the build never calls the API", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("uses the owner frame so a signed-out visitor returns here", () => {
    const frame = (OwnerBookingsPage() as unknown as { props: FrameProps })
      .props;
    expect(frame.path).toBe("/dashboard/bookings");
  });

  it("passes the salon, deposit, services and stylists to the section", async () => {
    const frame = (OwnerBookingsPage() as unknown as { props: FrameProps })
      .props;
    const section = await frame.children(SALON);
    expect(isValidElement(section)).toBe(true);
    expect((section as { props: unknown }).props).toEqual({
      salonId: "salon-1",
      depositKobo: 500000,
      services: SERVICES,
      stylists: STYLISTS,
    });
  });

  it("lets a failed read reach the error page instead of showing a wrong list", async () => {
    getOwnerSalonServices.mockRejectedValue(new Error("down"));
    const frame = (OwnerBookingsPage() as unknown as { props: FrameProps })
      .props;
    await expect(frame.children(SALON)).rejects.toThrow("down");
  });
});
