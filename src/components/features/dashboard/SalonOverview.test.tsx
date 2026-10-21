import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OwnerSalon } from "@/lib/api";
import { SalonOverview } from "./SalonOverview";

const SALON: OwnerSalon = {
  id: "11111111-1111-4111-8111-111111111111",
  owner_id: "22222222-2222-4222-8222-222222222222",
  name: "Pink Studio",
  address: "12 Admiralty Way, Lekki",
  phone: "08012345678",
  image_url: null,
  cancellation_hours: 24,
  deposit_amount: 500000,
  created_at: "2026-10-01T10:00:00Z",
  status: "approved",
};

describe("SalonOverview", () => {
  it("shows the name, address and phone", () => {
    render(<SalonOverview salon={SALON} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Pink Studio" }),
    ).toBeInTheDocument();
    expect(screen.getByText("12 Admiralty Way, Lekki")).toBeInTheDocument();
    expect(screen.getByText("08012345678")).toBeInTheDocument();
  });

  it.each([
    ["pending", "Waiting for approval", /until it's approved/],
    ["approved", "Approved", /Your salon is live/],
    ["suspended", "Suspended", /bookings are paused/],
  ] as const)(
    "shows a %s salon's status in words",
    (status, label, message) => {
      render(<SalonOverview salon={{ ...SALON, status }} />);
      expect(screen.getByText("Status:")).toBeInTheDocument();
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(message)).toBeInTheDocument();
    },
  );

  it("shows a gradient tile and no photo when the salon has no image", () => {
    render(<SalonOverview salon={SALON} />);
    expect(screen.getByTestId("salon-image-fallback")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows the owner's photo with a descriptive alt when there is an image", () => {
    render(
      <SalonOverview
        salon={{ ...SALON, image_url: "https://example.com/pink.jpg" }}
      />,
    );
    const photo = screen.getByRole("img", { name: "Photo of Pink Studio" });
    expect(photo.getAttribute("src")).toContain("example.com/pink.jpg");
    expect(screen.queryByTestId("salon-image-fallback")).toBeNull();
  });

  it("shows the deposit in naira, converted from kobo", () => {
    render(<SalonOverview salon={{ ...SALON, deposit_amount: 250050 }} />);
    expect(screen.getByText("Deposit:")).toBeInTheDocument();
    expect(screen.getByText("₦2,500.50")).toBeInTheDocument();
  });

  it("states the refund rule with the salon's own cancellation hours", () => {
    render(<SalonOverview salon={{ ...SALON, cancellation_hours: 48 }} />);
    expect(
      screen.getByText(
        "Refund only if you cancel more than 48 hours before your appointment.",
      ),
    ).toBeInTheDocument();
  });

  it("uses the singular for one hour", () => {
    render(<SalonOverview salon={{ ...SALON, cancellation_hours: 1 }} />);
    expect(
      screen.getByText(
        "Refund only if you cancel more than 1 hour before your appointment.",
      ),
    ).toBeInTheDocument();
  });
});
