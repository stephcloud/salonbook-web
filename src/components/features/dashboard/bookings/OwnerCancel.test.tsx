import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import type { OwnerBooking, Service, Stylist } from "@/lib/api";
import { json, routeFetch } from "@/tests/route-fetch";
import { OwnerBookingsSection } from "./OwnerBookingsSection";

const SALON = "11111111-1111-4111-8111-111111111111";
const LIST = `GET /api/proxy/salons/${SALON}/bookings`;
const CANCEL = "POST /api/proxy/bookings/b1/cancel";
const SERVICE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ADA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const HOUR = 3_600_000;
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

function at(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * HOUR).toISOString();
}

function booking(overrides: Partial<OwnerBooking> = {}) {
  return {
    id: "b1",
    status: "confirmed",
    starts_at: at(48),
    ends_at: at(49),
    refund_due: null,
    payment_status: "paid",
    stylist: { id: ADA, name: "Ada" },
    service: { id: SERVICE_ID, name: "Braids", duration_minutes: 60 },
    client_name: "Ngozi O.",
    ...overrides,
  } as OwnerBooking;
}

function cancelled(refund_due: boolean | null) {
  return { id: "b1", status: "cancelled", refund_due };
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

async function openDialog() {
  fireEvent.click(
    await screen.findByRole("button", { name: /^Cancel booking for/ }),
  );
  return screen.findByRole("alertdialog");
}

afterEach(() => vi.unstubAllGlobals());

describe("owner cancel button", () => {
  it.each([
    ["cancelled", at(48)],
    ["completed", at(48)],
    ["no_show", at(48)],
    ["confirmed", at(-3)],
  ])("is hidden for a %s booking starting %s", async (status, starts_at) => {
    routeFetch({
      [LIST]: () =>
        json([
          booking({ status: status as OwnerBooking["status"], starts_at }),
        ]),
    });
    renderSection();

    await screen.findByText("Ngozi O.");
    expect(
      screen.queryByRole("button", { name: /Cancel booking for/ }),
    ).not.toBeInTheDocument();
  });

  it("is shown for an upcoming pending booking", async () => {
    routeFetch({
      [LIST]: () =>
        json([booking({ status: "pending", payment_status: null })]),
    });
    renderSection();

    expect(
      await screen.findByRole("button", {
        name: /Cancel booking for Ngozi O\./,
      }),
    ).toBeInTheDocument();
  });
});

describe("owner cancel dialog", () => {
  it("tells the owner the client is refunded and emailed for a confirmed booking", async () => {
    routeFetch({ [LIST]: () => json([booking()]) });
    renderSection();

    const dialog = await openDialog();
    expect(dialog).toHaveTextContent(
      "The client will be refunded their full deposit and will be emailed that the salon cancelled.",
    );
    expect(screen.getByRole("button", { name: "Keep booking" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cancel booking" }),
    ).toBeVisible();
  });

  it("says there is nothing to refund, and no email, for a pending booking", async () => {
    routeFetch({
      [LIST]: () =>
        json([booking({ status: "pending", payment_status: null })]),
    });
    renderSection();

    const dialog = await openDialog();
    expect(dialog).toHaveTextContent("nothing to refund");
    expect(dialog).not.toHaveTextContent(/emailed/);
  });

  it("cancels once, refreshes the list and shows the refund outcome", async () => {
    let rows = [booking()];
    const { count } = routeFetch({
      [LIST]: () => json(rows),
      [CANCEL]: () => {
        rows = [booking({ status: "cancelled", payment_status: "refunded" })];
        return json(cancelled(true));
      },
    });
    renderSection();

    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(
      await screen.findByText(
        "Cancelled Ngozi O.'s booking. Deposit will be refunded in full.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(count(LIST)).toBe(2));
    expect(count(CANCEL)).toBe(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Cancel booking for/ }),
    ).not.toBeInTheDocument();
  });

  it("says there is nothing to refund when the API does not say a refund is due", async () => {
    routeFetch({
      [LIST]: () =>
        json([booking({ status: "pending", payment_status: null })]),
      [CANCEL]: () => json(cancelled(false)),
    });
    renderSection();

    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(
      await screen.findByText(
        "Cancelled Ngozi O.'s booking. Nothing to refund.",
      ),
    ).toBeInTheDocument();
  });

  it("sends one request when the confirm button is double clicked", async () => {
    let finish: () => void = () => {};
    const { count } = routeFetch({
      [LIST]: () => json([booking()]),
      [CANCEL]: () =>
        new Promise<Response>((resolve) => {
          finish = () => resolve(json(cancelled(true)));
        }),
    });
    renderSection();

    await openDialog();
    const confirm = screen.getByRole("button", { name: "Cancel booking" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(
      await screen.findByRole("button", { name: "Cancelling..." }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(count(CANCEL)).toBe(1);
    finish();
    await screen.findByText(/Deposit will be refunded in full/);
    expect(count(CANCEL)).toBe(1);
  });

  it("explains a 409, offers only Close and refreshes the list", async () => {
    const { count } = routeFetch({
      [LIST]: () => json([booking()]),
      [CANCEL]: () => json({ detail: "Booking already started" }, 409),
    });
    renderSection();

    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This booking can't be cancelled any more",
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    await waitFor(() => expect(count(LIST)).toBe(2));
  });

  it("shows a role message for a 403", async () => {
    routeFetch({
      [LIST]: () => json([booking()]),
      [CANCEL]: () => json({ detail: "forbidden" }, 403),
    });
    renderSection();

    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only the owner of this salon can cancel its bookings.",
    );
  });

  it("shows the server's field errors for a 422", async () => {
    routeFetch({
      [LIST]: () => json([booking()]),
      [CANCEL]: () =>
        json(
          {
            detail: [
              {
                loc: ["path", "booking_id"],
                msg: "Input should be a valid UUID",
                type: "uuid_parsing",
              },
            ],
          },
          422,
        ),
    });
    renderSection();

    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Input should be a valid UUID",
    );
  });

  it("offers a retry after a network failure", async () => {
    let attempts = 0;
    const { count } = routeFetch({
      [LIST]: () => json([booking()]),
      [CANCEL]: () => {
        attempts += 1;
        if (attempts === 1) throw new TypeError("Failed to fetch");
        return json(cancelled(true));
      },
    });
    renderSection();

    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the server",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByText(/Deposit will be refunded in full/),
    ).toBeVisible();
    expect(count(CANCEL)).toBe(2);
  });

  it("closes with Keep booking without sending anything", async () => {
    const { count } = routeFetch({ [LIST]: () => json([booking()]) });
    renderSection();

    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Keep booking" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(count(CANCEL)).toBe(0);
  });
});

describe("owner cancel edge cases", () => {
  async function cancelFirst() {
    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
    return screen.findByText(/Cancelled Ngozi O\.'s booking/);
  }

  function pagedRows() {
    return [
      booking(),
      ...Array.from({ length: 20 }, (_, i) =>
        booking({
          id: `other-${i}`,
          status: "completed",
          client_name: `Client ${i}`,
        }),
      ),
    ];
  }

  it("sends the owner to sign in after a 401 on cancel", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      assign,
      pathname: "/dashboard/bookings",
      search: "",
    });
    routeFetch({
      [LIST]: () => json([booking()]),
      [CANCEL]: () => json({ detail: "not authenticated" }, 401),
    });
    renderSection();

    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    expect(assign.mock.calls[0][0]).toMatch(/^\/login\?next=/);
  });

  it("clears the result notice when a filter changes", async () => {
    routeFetch({
      [LIST]: () => json([booking()]),
      [CANCEL]: () => json(cancelled(true)),
    });
    renderSection();

    expect(await cancelFirst()).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "confirmed" },
    });

    await waitFor(() =>
      expect(
        screen.queryByText(/Cancelled Ngozi O\.'s booking/),
      ).not.toBeInTheDocument(),
    );
  });

  it("clears the result notice when Next is clicked", async () => {
    routeFetch({
      [LIST]: () => json(pagedRows()),
      [CANCEL]: () => json(cancelled(true)),
    });
    renderSection();

    expect(await cancelFirst()).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Next" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(
        screen.queryByText(/Cancelled Ngozi O\.'s booking/),
      ).not.toBeInTheDocument(),
    );
  });

  it("clears the result notice when Previous is clicked", async () => {
    routeFetch({
      [LIST]: () => json(pagedRows()),
      [CANCEL]: () => json(cancelled(true)),
    });
    renderSection();

    await screen.findByText("Client 0");
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    await screen.findByText("Page 2");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled(),
    );

    expect(await cancelFirst()).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    await waitFor(() =>
      expect(
        screen.queryByText(/Cancelled Ngozi O\.'s booking/),
      ).not.toBeInTheDocument(),
    );
  });

  it("hides the Cancel button at once, before the refreshed list arrives", async () => {
    let lists = 0;
    const { count } = routeFetch({
      [LIST]: () => {
        lists += 1;
        if (lists === 1) return json([booking()]);
        return new Promise<Response>(() => {});
      },
      [CANCEL]: () => json(cancelled(true)),
    });
    renderSection();

    expect(await cancelFirst()).toBeInTheDocument();
    await waitFor(() => expect(count(LIST)).toBe(2));
    expect(screen.getByText("Ngozi O.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Cancel booking for/ }),
    ).not.toBeInTheDocument();
  });

  it("says the booking could not be found for a 404 and offers only Close", async () => {
    routeFetch({
      [LIST]: () => json([booking()]),
      [CANCEL]: () => json({ detail: "Booking not found" }, 404),
    });
    renderSection();

    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This booking could not be found.",
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });
});
