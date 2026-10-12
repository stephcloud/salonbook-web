import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

const getSalonNames = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getSalonNames: () => getSalonNames(),
}));

import { SALON_SUGGESTIONS_ID } from "@/lib/salon-search";
import { SalonNameSuggestions } from "./SalonNameSuggestions";

describe("SalonNameSuggestions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the names as options in the datalist the input points at", async () => {
    getSalonNames.mockResolvedValue(["Pink Studio", "Glow"]);
    const { container } = render(await SalonNameSuggestions());
    const list = container.querySelector("datalist");
    expect(list).toHaveAttribute("id", SALON_SUGGESTIONS_ID);
    expect(
      Array.from(list?.querySelectorAll("option") ?? []).map((o) => o.value),
    ).toEqual(["Pink Studio", "Glow"]);
  });

  it("keeps odd characters as plain text", async () => {
    getSalonNames.mockResolvedValue(['Tom & "Co" <b>x</b>']);
    const { container } = render(await SalonNameSuggestions());
    expect(container.querySelector("option")?.value).toBe(
      'Tom & "Co" <b>x</b>',
    );
    expect(container.querySelector("b")).toBeNull();
  });

  it("renders nothing when there are no names", async () => {
    getSalonNames.mockResolvedValue([]);
    const { container } = render(await SalonNameSuggestions());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the names cannot be fetched", async () => {
    getSalonNames.mockRejectedValue(new Error("down"));
    const { container } = render(await SalonNameSuggestions());
    expect(container).toBeEmptyDOMElement();
  });
});
