import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import type { OwnerBooking, Service, Stylist } from "@/lib/api";
import { json, routeFetch } from "@/tests/route-fetch";
import { OwnerBookingsSection } from "./OwnerBookingsSection";

const SALON = "11111111-1111-4111-8111-111111111111";
const LIST = `GET /api/proxy/salons/${SALON}/bookings`;
const SERVICE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ADA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const SERVICES: Service[] = [
  {
    id: SERVICE_ID,
    salon_id: SALON,
    name: "Braids",
    duration_minutes: 60,
    price_type: "fixed",
    price: 1500000,
    created_at: "2026-10-12T00:00:00Z",
  },
];
const STYLISTS: Stylist[] = [
  { id: ADA, name: "Ada", image_url: null, service_ids: [SERVICE_ID] },
];

function booking(n: number) {
  return {
    id: `b${n}`,
    status: "confirmed",
    starts_at: "2026-10-16T08:00:00Z",
    ends_at: "2026-10-16T09:00:00Z",
    refund_due: null,
    payment_status: "paid",
    stylist: { id: ADA, name: "Ada" },
    service: { id: SERVICE_ID, name: "Braids", duration_minutes: 60 },
    client_name: `Client ${n}`,
  } as OwnerBooking;
}

function renderSection() {
  return render(
    <QueryProvider>
      <OwnerBookingsSection
        salonId={SALON}
        depositKobo={500000}
        services={SERVICES}
        stylists={STYLISTS}
      />
    </QueryProvider>,
  );
}

const twentyOne = () => Array.from({ length: 21 }, (_, i) => booking(i));

afterEach(() => vi.unstubAllGlobals());

describe("OwnerBookingsSection paging", () => {
  it("goes to the next page and back with Previous", async () => {
    routeFetch({ [LIST]: () => json(twentyOne()) });
    renderSection();
    await screen.findByText("Client 0");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 2")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("Page 1")).toBeInTheDocument();
    expect(screen.getByText("Client 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("disables Next on the last page", async () => {
    let call = 0;
    routeFetch({
      [LIST]: () => json(++call === 1 ? twentyOne() : [booking(99)]),
    });
    renderSection();
    await screen.findByText("Client 0");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Client 99")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled(),
    );
  });

  it("moves focus to the Bookings heading once the new page has loaded", async () => {
    routeFetch({ [LIST]: () => json(twentyOne()) });
    renderSection();
    await screen.findByText("Client 0");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Page 2");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Results" })).toHaveFocus(),
    );
  });
});

describe("OwnerBookingsSection stale data", () => {
  it("dims the old rows with aria-busy while the next page loads", async () => {
    let release: (r: Response) => void = () => {};
    let call = 0;
    routeFetch({
      [LIST]: () =>
        ++call === 1
          ? json(twentyOne())
          : new Promise<Response>((resolve) => {
              release = resolve;
            }),
    });
    renderSection();
    await screen.findByText("Client 0");
    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "false");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true"),
    );
    expect(screen.getByRole("list")).toHaveClass("opacity-50");
    expect(screen.getByText("Client 0")).toBeInTheDocument();

    release(json([booking(50)]));
    expect(await screen.findByText("Client 50")).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("list")).not.toHaveClass("opacity-50");
  });

  it("shows the error and not the old rows when a filter change fails", async () => {
    let fail = false;
    routeFetch({
      [LIST]: () => (fail ? json({ detail: "bad" }, 422) : json([booking(1)])),
    });
    renderSection();
    await screen.findByText("Client 1");

    fail = true;
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "cancelled" },
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Those filters were not accepted/);
    expect(screen.queryByText("Client 1")).not.toBeInTheDocument();
    expect(
      within(alert).queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });
});

describe("OwnerBookingsSection error messages", () => {
  it("explains a 422 without offering Retry", async () => {
    routeFetch({ [LIST]: () => json({ detail: "bad" }, 422) });
    renderSection();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Those filters were not accepted. Please change them and try again.",
    );
    expect(
      within(alert).queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });

  it("explains a 403 with the owner-only message", async () => {
    routeFetch({ [LIST]: () => json({ detail: "forbidden" }, 403) });
    renderSection();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only the owner of this salon can see its bookings.",
    );
  });
});
