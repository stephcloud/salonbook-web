import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

const getSalonAreas = vi.fn();
vi.mock("@/lib/api-server", () => ({
  getSalonAreas: () => getSalonAreas(),
}));

import { SalonAreaChips } from "./SalonAreaChips";

describe("SalonAreaChips", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders one submit button per area that fills ?q= in a GET form", async () => {
    getSalonAreas.mockResolvedValue(["Lagos", "GRA"]);
    const { container } = render(await SalonAreaChips({ query: "" }));

    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/salons");
    expect(screen.getByRole("group", { name: "Areas" })).toBeInTheDocument();

    const lagos = screen.getByRole("button", { name: "Lagos" });
    expect(lagos).toHaveAttribute("type", "submit");
    expect(lagos).toHaveAttribute("name", "q");
    expect(lagos).toHaveAttribute("value", "Lagos");
    expect(lagos).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("marks the area being searched as pressed, and pressing it clears", async () => {
    getSalonAreas.mockResolvedValue(["Lagos", "GRA"]);
    render(await SalonAreaChips({ query: " lagos" }));

    const lagos = screen.getByRole("button", { name: "Lagos" });
    expect(lagos).toHaveAttribute("aria-pressed", "true");
    expect(lagos).toHaveAttribute("value", "");
    expect(screen.getByRole("button", { name: "GRA" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders nothing when there are no areas", async () => {
    getSalonAreas.mockResolvedValue([]);
    const { container } = render(await SalonAreaChips({ query: "" }));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the areas cannot be fetched", async () => {
    getSalonAreas.mockRejectedValue(new Error("down"));
    const { container } = render(await SalonAreaChips({ query: "" }));
    expect(container).toBeEmptyDOMElement();
  });
});
