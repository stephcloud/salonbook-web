import { render, screen } from "@testing-library/react";
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Salon, Service } from "@/lib/api";

const getOwnerSalonServices = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getOwnerSalonServices: (id: string) => getOwnerSalonServices(id),
}));

vi.mock("@/components/features/dashboard/OwnerSalonPage", () => ({
  OwnerSalonPage: (props: Record<string, unknown>) => props,
}));

const sectionProps = vi.fn();
vi.mock("@/components/features/dashboard/ServicesSection", () => ({
  ServicesSection: (props: unknown) => {
    sectionProps(props);
    return <p>services section</p>;
  },
}));

import ServicesPage, { dynamic } from "./page";

const SALON = { id: "salon-1", name: "Pink Studio" } as Salon;
const SERVICES = [{ id: "svc-1", name: "Braids" }] as Service[];

type FrameProps = {
  path: string;
  title: string;
  children: (salon: Salon) => Promise<ReactNode>;
};

beforeEach(() => {
  vi.clearAllMocks();
  getOwnerSalonServices.mockResolvedValue(SERVICES);
});

describe("ServicesPage", () => {
  it("is never prerendered", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("uses the owner frame for /dashboard/services", () => {
    const element = ServicesPage();
    expect(isValidElement(element)).toBe(true);
    const props = (element as { props: FrameProps }).props;
    expect(props.path).toBe("/dashboard/services");
    expect(props.title).toBe("Services");
  });

  it("reads the salon's services on the server and hands them to the section", async () => {
    const frame = (ServicesPage() as { props: FrameProps }).props;
    const body = await frame.children(SALON);
    render(<>{body}</>);
    expect(getOwnerSalonServices).toHaveBeenCalledWith("salon-1");
    expect(screen.getByText("services section")).toBeInTheDocument();
    expect(sectionProps).toHaveBeenCalledWith({
      salonId: "salon-1",
      initialServices: SERVICES,
    });
  });

  it("lets a failed read reach the error page instead of showing an empty list", async () => {
    getOwnerSalonServices.mockRejectedValue(new Error("boom"));
    const frame = (ServicesPage() as { props: FrameProps }).props;
    await expect(frame.children(SALON)).rejects.toThrow("boom");
  });
});
