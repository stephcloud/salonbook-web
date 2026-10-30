import { describe, expect, it, vi } from "vitest";

// The cold page imports timed out at 5s under the full suite's load.
vi.setConfig({ testTimeout: 20_000 });

// Only the page metadata is read, so the server reads are stubbed out.
vi.mock("@/lib/api-server", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
  loginRedirectUrl: vi.fn(),
  getMyBooking: vi.fn(),
  getMyBookings: vi.fn(),
  getMySalons: vi.fn(),
  getSalon: vi.fn(),
  getSalonServices: vi.fn(),
  getSalonStylists: vi.fn(),
  getOwnerSalonServices: vi.fn(),
  getOwnerSalonStylists: vi.fn(),
  getStylistAvailability: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

// Pages behind login: search engines should not list them.
const PRIVATE_PAGES = {
  "/book/[salonId]": () => import("./book/[salonId]/page"),
  "/bookings": () => import("./bookings/page"),
  "/bookings/[id]/pay": () => import("./bookings/[id]/pay/page"),
  "/payment/callback": () => import("./payment/callback/page"),
  "/dashboard": () => import("./dashboard/page"),
  "/dashboard/services": () => import("./dashboard/services/page"),
  "/dashboard/stylists": () => import("./dashboard/stylists/page"),
  "/dashboard/availability": () => import("./dashboard/availability/page"),
  "/dashboard/bookings": () => import("./dashboard/bookings/page"),
};

describe("private pages", () => {
  it.each(Object.entries(PRIVATE_PAGES))(
    "%s is marked noindex",
    async (_route, load) => {
      const { metadata } = await load();
      expect(metadata.robots).toEqual({ index: false, follow: false });
    },
  );
});
