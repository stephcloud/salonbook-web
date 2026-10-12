import { render, screen } from "@testing-library/react";
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Salon, Service, Stylist } from "@/lib/api";

const getSalonServices = vi.fn();
const getSalonStylists = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getSalonServices: (id: string) => getSalonServices(id),
  getSalonStylists: (id: string) => getSalonStylists(id),
}));

vi.mock("@/components/features/dashboard/OwnerSalonPage", () => ({
  OwnerSalonPage: (props: Record<string, unknown>) => props,
}));

const sectionProps = vi.fn();
vi.mock("@/components/features/dashboard/StylistsSection", () => ({
  StylistsSection: (props: unknown) => {
    sectionProps(props);
    return <p>stylists section</p>;
  },
}));

import StylistsPage, { dynamic } from "./page";

const SALON = { id: "salon-1", name: "Pink Studio" } as Salon;
const SERVICES = [{ id: "svc-1", name: "Braids" }] as Service[];
const STYLISTS = [{ id: "sty-1", name: "Ada" }] as Stylist[];

type FrameProps = {
  path: string;
  title: string;
  children: (salon: Salon) => Promise<ReactNode>;
};

beforeEach(() => {
  vi.clearAllMocks();
  getSalonServices.mockResolvedValue(SERVICES);
  getSalonStylists.mockResolvedValue(STYLISTS);
});

describe("StylistsPage", () => {
  it("is never prerendered", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("uses the owner frame for /dashboard/stylists", () => {
    const element = StylistsPage();
    expect(isValidElement(element)).toBe(true);
    const props = (element as { props: FrameProps }).props;
    expect(props.path).toBe("/dashboard/stylists");
    expect(props.title).toBe("Stylists");
  });

  it("reads services and stylists on the server and hands both to the section", async () => {
    const frame = (StylistsPage() as { props: FrameProps }).props;
    const body = await frame.children(SALON);
    render(<>{body}</>);
    expect(getSalonServices).toHaveBeenCalledWith("salon-1");
    expect(getSalonStylists).toHaveBeenCalledWith("salon-1");
    expect(screen.getByText("stylists section")).toBeInTheDocument();
    expect(sectionProps).toHaveBeenCalledWith({
      salonId: "salon-1",
      initialServices: SERVICES,
      initialStylists: STYLISTS,
    });
  });

  it("lets a failed read reach the error page", async () => {
    getSalonStylists.mockRejectedValue(new Error("boom"));
    const frame = (StylistsPage() as { props: FrameProps }).props;
    await expect(frame.children(SALON)).rejects.toThrow("boom");
  });
});
