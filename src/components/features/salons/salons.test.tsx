import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Salon, Service } from "@/lib/api";
import { CopySalonLinkButton } from "./CopySalonLinkButton";
import { LoadError } from "./LoadError";
import { LoadingShell } from "./LoadingShell";
import { SalonHeader } from "./SalonHeader";
import { SalonImage } from "./SalonImage";
import { SalonList } from "./SalonList";
import { ServiceList } from "./ServiceList";
import { ServiceRow } from "./ServiceRow";
import { StylistAvatar } from "./StylistAvatar";
import { StylistList } from "./StylistList";

const SALON_ID = "11111111-1111-4111-8111-111111111111";
const SERVICE_ID = "22222222-2222-4222-8222-222222222222";

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: SERVICE_ID,
    salon_id: SALON_ID,
    name: "Box braids",
    duration_minutes: 90,
    price_type: "fixed",
    price: 1500000,
    created_at: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

function makeSalon(overrides: Partial<Salon> = {}): Salon {
  return {
    id: SALON_ID,
    owner_id: "33333333-3333-4333-8333-333333333333",
    name: "Pink Studio",
    address: "12 Admiralty Way, Lekki",
    phone: "08012345678",
    image_url: null,
    cancellation_hours: 24,
    deposit_amount: 500000,
    created_at: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

describe("ServiceRow price display", () => {
  it("shows a fixed price in naira and the deposit", () => {
    render(
      <ul>
        <ServiceRow
          service={makeService()}
          salonId={SALON_ID}
          deposit={500000}
        />
      </ul>,
    );
    expect(screen.getByText("₦15,000")).toBeInTheDocument();
    expect(screen.getByText("Deposit: ₦5,000")).toBeInTheDocument();
    expect(screen.queryByText("Price on consultation")).not.toBeInTheDocument();
  });

  it("shows 'Price on consultation' for a quote and still shows the deposit", () => {
    render(
      <ul>
        <ServiceRow
          service={makeService({ price_type: "quote", price: null })}
          salonId={SALON_ID}
          deposit={500000}
        />
      </ul>,
    );
    expect(screen.getByText("Price on consultation")).toBeInTheDocument();
    expect(screen.getByText("Deposit: ₦5,000")).toBeInTheDocument();
  });

  it("links the Book pill to the wizard with the service preselected", () => {
    render(
      <ul>
        <ServiceRow
          service={makeService()}
          salonId={SALON_ID}
          deposit={500000}
        />
      </ul>,
    );
    expect(
      screen.getByRole("link", { name: "Book Box braids" }),
    ).toHaveAttribute("href", `/book/${SALON_ID}?service=${SERVICE_ID}`);
  });
});

describe("empty states", () => {
  it("says 'No salons yet' when the list is empty", () => {
    render(<SalonList salons={[]} page={1} pageSize={20} />);
    expect(screen.getByText("No salons yet")).toBeInTheDocument();
  });

  it("says 'No services yet' when a salon has none", () => {
    render(<ServiceList services={[]} salonId={SALON_ID} deposit={0} />);
    expect(screen.getByText("No services yet")).toBeInTheDocument();
  });

  it("says 'No stylists yet' when a salon has none", () => {
    render(<StylistList stylists={[]} />);
    expect(screen.getByText("No stylists yet")).toBeInTheDocument();
  });
});

describe("SalonList paging", () => {
  it("offers Next only when the page is full", () => {
    const full = Array.from({ length: 2 }, (_, i) =>
      makeSalon({ id: `id-${i}`, name: `Salon ${i}` }),
    );
    render(<SalonList salons={full} page={1} pageSize={2} />);
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/salons?page=2",
    );
    expect(screen.queryByRole("link", { name: "Previous" })).toBeNull();
  });
});

describe("LoadError", () => {
  it("shows a Retry button that calls reset", async () => {
    const reset = vi.fn();
    render(<LoadError title="We could not load the salons" reset={reset} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe("image fallbacks", () => {
  it("shows the first letter of the stylist name when there is no photo", () => {
    render(<StylistAvatar name="amara" src={null} />);
    expect(screen.getByTestId("stylist-initial")).toHaveTextContent("A");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders the stylist photo as decorative, since the name sits beside it", () => {
    const { container } = render(
      <StylistAvatar name="Amara" src="https://img.test/a.jpg" />,
    );
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.queryByTestId("stylist-initial")).toBeNull();
  });

  it("shows the gradient tile when the salon has no photo", () => {
    render(<SalonImage src={null} alt="Photo of Pink Studio" />);
    expect(screen.getByTestId("salon-image-fallback")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("CopySalonLinkButton", () => {
  afterEach(() => vi.restoreAllMocks());

  it("copies the salon link and confirms", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<CopySalonLinkButton salonId={SALON_ID} />);
    await user.click(screen.getByRole("button", { name: "Copy salon link" }));
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/salons/${SALON_ID}`,
    );
    expect(
      await screen.findByRole("button", { name: "Link copied" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Salon link copied to the clipboard.",
    );
  });

  it("shows the link to copy by hand when the clipboard is blocked", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );
    render(<CopySalonLinkButton salonId={SALON_ID} />);
    await user.click(screen.getByRole("button", { name: "Copy salon link" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Could not copy automatically",
    );
    expect(await screen.findByLabelText("Copy this link")).toHaveValue(
      `${window.location.origin}/salons/${SALON_ID}`,
    );
  });
});

describe("SalonList navigation", () => {
  const two = [
    makeSalon({ id: "a", name: "A" }),
    makeSalon({ id: "b", name: "B" }),
  ];

  it("goes back to /salons from page 2 and to ?page= from later pages", () => {
    const { rerender } = render(
      <SalonList salons={two} page={2} pageSize={5} />,
    );
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/salons",
    );
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Next" })).toBeNull();

    rerender(<SalonList salons={two} page={3} pageSize={5} />);
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/salons?page=2",
    );
  });

  it("says 'No more salons' past the last page", () => {
    render(<SalonList salons={[]} page={4} pageSize={20} />);
    expect(screen.getByText("No more salons")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to the first page" }),
    ).toHaveAttribute("href", "/salons");
  });
});

describe("SalonHeader", () => {
  it("shows the deposit, refund rule, phone link and Book now link", () => {
    render(<SalonHeader salon={makeSalon()} />);
    expect(screen.getByText("₦5,000")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Refund only if you cancel more than 24 hours before your appointment.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "08012345678" })).toHaveAttribute(
      "href",
      "tel:08012345678",
    );
    expect(screen.getByRole("link", { name: "Book now" })).toHaveAttribute(
      "href",
      `/book/${SALON_ID}`,
    );
  });

  it("uses the singular for a one hour window", () => {
    render(<SalonHeader salon={makeSalon({ cancellation_hours: 1 })} />);
    expect(screen.getByText(/more than 1 hour before/)).toBeInTheDocument();
  });
});

describe("LoadingShell", () => {
  it("tells the visitor the server may be waking up", () => {
    render(<LoadingShell />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Waking up the server...",
    );
  });

  it("renders the detail variant too", () => {
    render(<LoadingShell variant="detail" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
