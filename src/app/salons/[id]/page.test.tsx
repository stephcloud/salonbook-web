// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const getSalon = vi.fn();
const getSalonServices = vi.fn();
const getSalonStylists = vi.fn();
vi.mock("@/lib/api-server", async () => {
  const { ApiError } = await import("@/lib/api");
  return {
    getSalon: (id: string) => getSalon(id),
    getSalonServices: (id: string) => getSalonServices(id),
    getSalonStylists: (id: string) => getSalonStylists(id),
    isMissingResource: (e: unknown) =>
      e instanceof ApiError && (e.status === 404 || e.status === 422),
  };
});

import { ApiError } from "@/lib/api";
import SalonDetailPage, { generateMetadata } from "./page";

const params = Promise.resolve({ id: "abc" });

describe("salon detail page loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    getSalon.mockResolvedValue({ id: "abc", name: "Pink Studio" });
    getSalonServices.mockRejectedValue(new ApiError(404, "no services"));
    await expect(SalonDetailPage({ params })).rejects.toMatchObject({
      status: 404,
    });
    expect(notFound).not.toHaveBeenCalled();
  });

  it("titles the page with the salon name, with a generic fallback", async () => {
    getSalon.mockResolvedValueOnce({ id: "abc", name: "Pink Studio" });
    await expect(generateMetadata({ params })).resolves.toEqual({
      title: "Pink Studio · SalonBook",
    });
    getSalon.mockRejectedValueOnce(new ApiError(500, "boom"));
    await expect(generateMetadata({ params })).resolves.toEqual({
      title: "Salon · SalonBook",
    });
  });
});
