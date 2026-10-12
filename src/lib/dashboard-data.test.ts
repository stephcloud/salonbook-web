import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Salon, Service, Stylist } from "@/lib/api";

const getSalonServices = vi.fn();
const getSalonStylists = vi.fn();
const getStylistAvailability = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getSalonServices: (id: string) => getSalonServices(id),
  getSalonStylists: (id: string) => getSalonStylists(id),
  getStylistAvailability: (id: string) => getStylistAvailability(id),
}));

import { MAX_AVAILABILITY_READS, loadChecklistInput } from "./dashboard-data";

const SALON = { id: "salon-1", name: "Pink Studio" } as Salon;
const SERVICE = { id: "service-1" } as Service;
const stylist = (id: string) => ({ id, name: id }) as Stylist;

beforeEach(() => {
  vi.clearAllMocks();
  getSalonServices.mockResolvedValue([]);
  getSalonStylists.mockResolvedValue([]);
});

describe("loadChecklistInput", () => {
  it("reads the salon's services and stylists and no hours when there are no stylists", async () => {
    getSalonServices.mockResolvedValue([SERVICE]);

    const result = await loadChecklistInput(SALON);

    expect(getSalonServices).toHaveBeenCalledWith("salon-1");
    expect(getSalonStylists).toHaveBeenCalledWith("salon-1");
    expect(getStylistAvailability).not.toHaveBeenCalled();
    expect(result).toEqual({
      salon: SALON,
      services: [SERVICE],
      stylists: [],
      availability: { read: [], unchecked: 0 },
    });
  });

  it("reads each stylist's hours", async () => {
    getSalonStylists.mockResolvedValue([stylist("a"), stylist("b")]);
    getStylistAvailability.mockImplementation(async (id: string) => ({
      stylist_id: id,
      rules: [],
    }));

    const result = await loadChecklistInput(SALON);

    expect(getStylistAvailability.mock.calls.map(([id]) => id)).toEqual([
      "a",
      "b",
    ]);
    expect(result.availability.read.map((r) => r.stylist_id)).toEqual([
      "a",
      "b",
    ]);
    expect(result.availability.unchecked).toBe(0);
  });

  it("counts a stylist whose hours could not be read as unchecked, without failing", async () => {
    getSalonStylists.mockResolvedValue([stylist("a"), stylist("b")]);
    getStylistAvailability.mockImplementation(async (id: string) => {
      if (id === "b") throw new Error("boom");
      return { stylist_id: id, rules: [] };
    });

    const result = await loadChecklistInput(SALON);

    expect(result.availability.read).toHaveLength(1);
    expect(result.availability.unchecked).toBe(1);
  });

  it("keeps the hours that were read, in order, when some reads fail and others succeed", async () => {
    getSalonStylists.mockResolvedValue([
      stylist("a"),
      stylist("b"),
      stylist("c"),
      stylist("d"),
    ]);
    getStylistAvailability.mockImplementation(async (id: string) => {
      if (id === "a" || id === "c") throw new Error("boom");
      return { stylist_id: id, rules: [] };
    });

    const result = await loadChecklistInput(SALON);

    expect(result.availability.read.map((r) => r.stylist_id)).toEqual([
      "b",
      "d",
    ]);
    expect(result.availability.unchecked).toBe(2);
    expect(result.stylists).toHaveLength(4);
  });

  it("counts every stylist as unchecked when all hours reads fail", async () => {
    getSalonStylists.mockResolvedValue([stylist("a"), stylist("b")]);
    getStylistAvailability.mockRejectedValue(new Error("down"));

    const result = await loadChecklistInput(SALON);

    expect(result.availability).toEqual({ read: [], unchecked: 2 });
  });

  it("adds failed reads and stylists past the limit together", async () => {
    const many = Array.from({ length: 22 }, (_, i) => stylist(`s${i}`));
    getSalonStylists.mockResolvedValue(many);
    getStylistAvailability.mockImplementation(async (id: string) => {
      if (id === "s0") throw new Error("boom");
      return { stylist_id: id, rules: [] };
    });

    const result = await loadChecklistInput(SALON);

    expect(result.availability.read).toHaveLength(19);
    expect(result.availability.unchecked).toBe(3);
  });

  it("reads at most 20 stylists and counts the rest as unchecked", async () => {
    const many = Array.from({ length: 25 }, (_, i) => stylist(`s${i}`));
    getSalonStylists.mockResolvedValue(many);
    getStylistAvailability.mockImplementation(async (id: string) => ({
      stylist_id: id,
      rules: [],
    }));

    const result = await loadChecklistInput(SALON);

    expect(MAX_AVAILABILITY_READS).toBe(20);
    expect(getStylistAvailability).toHaveBeenCalledTimes(20);
    expect(result.stylists).toHaveLength(25);
    expect(result.availability.unchecked).toBe(5);
  });

  it("lets a failed services or stylists read through so the page can offer a retry", async () => {
    getSalonServices.mockRejectedValue(new Error("down"));
    await expect(loadChecklistInput(SALON)).rejects.toThrow("down");

    getSalonServices.mockResolvedValue([]);
    getSalonStylists.mockRejectedValue(new Error("down too"));
    await expect(loadChecklistInput(SALON)).rejects.toThrow("down too");
  });
});
