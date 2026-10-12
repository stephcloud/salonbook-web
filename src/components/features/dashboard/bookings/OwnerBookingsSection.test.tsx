import {
  act,
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

function booking(n: number, overrides: Partial<OwnerBooking> = {}) {
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
    ...overrides,
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

function lastQuery(mock: ReturnType<typeof routeFetch>["mock"]) {
  const url = String(mock.mock.calls.at(-1)?.[0]);
  return new URLSearchParams(url.split("?")[1]);
}

afterEach(() => vi.unstubAllGlobals());

describe("OwnerBookingsSection", () => {
  it("shows a booking with Lagos time, price, deposit and no email", async () => {
    routeFetch({
      [LIST]: () =>
        json([
          booking(1, { client_name: "Ngozi O." }),
          booking(2, { status: "cancelled", payment_status: "refunded" }),
        ]),
    });
    renderSection();

    expect(await screen.findByText("Ngozi O.")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Fri, 16 Oct 2026, 9:00 AM/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("₦15,000")).toHaveLength(2);
    expect(screen.getAllByText(/₦5,000 · Deposit paid/)).toHaveLength(1);
    const list = within(screen.getByRole("list"));
    expect(list.getByText("Confirmed")).toBeInTheDocument();
    expect(list.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getAllByText("Refunded").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/@/);
  });

  it("asks for one extra row and offers Next only when it comes back", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => booking(i));
    const { mock } = routeFetch({ [LIST]: () => json(rows) });
    renderSection();

    await screen.findByText("Client 0");
    expect(screen.queryByText("Client 20")).not.toBeInTheDocument();
    expect(lastQuery(mock).get("limit")).toBe("21");
    expect(lastQuery(mock).get("offset")).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(lastQuery(mock).get("offset")).toBe("20"));
    expect(await screen.findByText("Page 2")).toBeInTheDocument();
  });

  it("sends the chosen filters and returns to page 1", async () => {
    const { mock } = routeFetch({ [LIST]: () => json([booking(1)]) });
    renderSection();
    await screen.findByText("Client 1");

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "cancelled" },
    });
    fireEvent.change(screen.getByLabelText("Stylist"), {
      target: { value: ADA },
    });
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-10-15" },
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-10-16" },
    });

    await waitFor(() => {
      const q = lastQuery(mock);
      expect(q.get("status")).toBe("cancelled");
      expect(q.get("stylist_id")).toBe(ADA);
      expect(q.get("from")).toBe("2026-10-15");
      expect(q.get("to")).toBe("2026-10-16");
      expect(q.get("offset")).toBe("0");
    });
  });

  it("does not ask the API for a reversed date range", async () => {
    const { mock } = routeFetch({ [LIST]: () => json([booking(1)]) });
    renderSection();
    await screen.findByText("Client 1");
    const before = mock.mock.calls.length;

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-10-17" },
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-10-15" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /From date must not be after/,
    );
    // The From change alone is a valid range and is requested; the reversed one is not.
    expect(mock.mock.calls.length).toBe(before + 1);
  });

  it("tells a new salon from a filter with no matches", async () => {
    routeFetch({ [LIST]: () => json([]) });
    renderSection();
    expect(await screen.findByText("No bookings yet")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "pending" },
    });
    expect(
      await screen.findByText("No bookings match these filters"),
    ).toBeInTheDocument();
    const empty = screen.getByText("No bookings match these filters")
      .parentElement as HTMLElement;
    fireEvent.click(
      within(empty).getByRole("button", { name: "Clear filters" }),
    );
    expect(await screen.findByText("No bookings yet")).toBeInTheDocument();
  });

  it("retries once on a server error, then shows Retry", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let calls = 0;
      routeFetch({
        [LIST]: () => {
          calls += 1;
          return calls <= 2
            ? json({ detail: "down" }, 503)
            : json([booking(1)]);
        },
      });
      renderSection();

      await vi.advanceTimersByTimeAsync(2500);
      const alert = await screen.findByRole("alert");
      expect(calls).toBe(2);
      fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
      expect(await screen.findByText("Client 1")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the role message for a 403 with no Retry", async () => {
    routeFetch({ [LIST]: () => json({ detail: "forbidden" }, 403) });
    renderSection();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Only the owner of this salon/);
    expect(
      within(alert).queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });

  it("shows the waking-up message while the first load is slow", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      routeFetch({ [LIST]: () => new Promise<Response>(() => {}) });
      renderSection();
      expect(screen.getAllByText("Loading bookings...").length).toBeGreaterThan(
        0,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4500);
      });
      expect(
        screen.getAllByText("Waking up the server...").length,
      ).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
