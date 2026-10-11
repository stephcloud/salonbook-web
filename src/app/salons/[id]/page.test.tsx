import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

// vi.fn() attaches handlers to the promises it returns, which would hide an
// unhandled rejection. Tests about that use this plain function instead.
let plainServices: (() => Promise<never>) | null = null;
const getSalon = vi.fn();
const getSalonServices = vi.fn();
const getSalonStylists = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getSalon: (id: string) => getSalon(id),
  getSalonServices: (id: string) =>
    plainServices ? plainServices() : getSalonServices(id),
  getSalonStylists: (id: string) => getSalonStylists(id),
}));

import { ApiError } from "@/lib/api";
import SalonDetailPage, { generateMetadata } from "./page";

const params = Promise.resolve({ id: "abc" });

const SALON = {
  id: "abc",
  owner_id: "owner",
  name: "Pink Studio",
  address: "12 Admiralty Way, Lekki",
  phone: "08012345678",
  image_url: null,
  cancellation_hours: 24,
  deposit_amount: 500000,
  created_at: "2026-10-01T10:00:00Z",
};

describe("salon detail page loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    plainServices = null;
    getSalonServices.mockResolvedValue([]);
    getSalonStylists.mockResolvedValue([]);
  });

  it.each([404, 422])(
    "shows not found when the salon answers %i",
    async (status) => {
      getSalon.mockRejectedValue(new ApiError(status, "nope"));
      await expect(SalonDetailPage({ params })).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(notFound).toHaveBeenCalled();
    },
  );

  it("rethrows a server error so the retry screen shows", async () => {
    getSalon.mockRejectedValue(new ApiError(500, "boom"));
    await expect(SalonDetailPage({ params })).rejects.toMatchObject({
      status: 500,
    });
    expect(notFound).not.toHaveBeenCalled();
  });

  it("does not say 'not found' when only the services list is missing", async () => {
    getSalon.mockResolvedValue(SALON);
    getSalonServices.mockRejectedValue(new ApiError(404, "no services"));
    await expect(SalonDetailPage({ params })).rejects.toMatchObject({
      status: 404,
    });
    expect(notFound).not.toHaveBeenCalled();
  });

  it("stays 'not found' when the salon is missing even if the lists fail too", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      getSalon.mockRejectedValue(new ApiError(404, "nope"));
      plainServices = () => Promise.reject(new ApiError(404, "nope"));
      await expect(SalonDetailPage({ params })).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      // Node reports unhandled rejections after the microtask queue drains.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("starts the lists without waiting for the salon", async () => {
    let resolveSalon: (value: typeof SALON) => void = () => {};
    getSalon.mockReturnValue(
      new Promise<typeof SALON>((resolve) => {
        resolveSalon = resolve;
      }),
    );

    const page = SalonDetailPage({ params });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getSalonServices).toHaveBeenCalledWith("abc");
    expect(getSalonStylists).toHaveBeenCalledWith("abc");

    resolveSalon(SALON);
    await expect(page).resolves.toBeTruthy();
  });

  it("renders the salon, its services and its stylists", async () => {
    getSalon.mockResolvedValue(SALON);
    getSalonServices.mockResolvedValue([
      {
        id: "s1",
        salon_id: "abc",
        name: "Box braids",
        duration_minutes: 90,
        price_type: "fixed",
        price: 1500000,
        created_at: "2026-10-01T10:00:00Z",
      },
    ]);
    getSalonStylists.mockResolvedValue([
      { id: "t1", name: "Amara", image_url: null, service_ids: ["s1"] },
    ]);

    render(await SalonDetailPage({ params }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Pink Studio" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByText("Box braids")).toBeInTheDocument();
    expect(screen.getByText("₦15,000")).toBeInTheDocument();
    expect(screen.getByText("Amara")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy salon link" }),
    ).toBeInTheDocument();
  });

  it("titles the page with the salon name, with a generic fallback", async () => {
    getSalon.mockResolvedValueOnce(SALON);
    await expect(generateMetadata({ params })).resolves.toEqual({
      title: "Pink Studio · SalonBook",
    });
    getSalon.mockRejectedValueOnce(new ApiError(500, "boom"));
    await expect(generateMetadata({ params })).resolves.toEqual({
      title: "Salon · SalonBook",
    });
  });
});
