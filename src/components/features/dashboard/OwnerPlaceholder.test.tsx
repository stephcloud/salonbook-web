import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
vi.mock("@/lib/api-server", () => ({
  requireUser: (next: string) => requireUser(next),
}));

import { OwnerPlaceholder } from "./OwnerPlaceholder";
import AvailabilityPage from "@/app/dashboard/availability/page";

// Services and stylists are real pages now (see OwnerSalonPage.test.tsx).
const PAGES = [
  ["/dashboard/availability", "Weekly hours", AvailabilityPage],
] as const;

// The pages return the async component; resolve it the way Next.js does.
async function renderPage(Page: () => React.ReactElement) {
  const element = Page() as React.ReactElement<
    React.ComponentProps<typeof OwnerPlaceholder>
  >;
  expect(element.type).toBe(OwnerPlaceholder);
  render(await OwnerPlaceholder(element.props));
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "o1", name: "Ada", role: "owner" });
});

describe.each(PAGES)("owner page %s", (path, title, Page) => {
  it("asks for sign-in and returns to this page", async () => {
    await renderPage(Page);
    expect(requireUser).toHaveBeenCalledWith(path);
  });

  it("shows an owner the title, that it comes next, and a way back", async () => {
    await renderPage(Page);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("heading", { level: 1, name: title }),
    ).toBeInTheDocument();
    expect(screen.getByText(/This part comes next/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("tells a client this area is for salon owners", async () => {
    requireUser.mockResolvedValue({ id: "c1", name: "Bola", role: "client" });
    await renderPage(Page);
    expect(
      screen.getByRole("heading", { name: "This area is for salon owners" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: title })).toBeNull();
  });
});
