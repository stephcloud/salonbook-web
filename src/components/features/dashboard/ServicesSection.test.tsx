import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import type { Service } from "@/lib/api";
import { json, noContent, routeFetch } from "@/tests/route-fetch";
import { ServicesSection } from "./ServicesSection";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const SALON = "11111111-1111-4111-8111-111111111111";
const LIST = `GET /api/proxy/salons/${SALON}/services`;
const CREATE = `POST /api/proxy/salons/${SALON}/services`;

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    salon_id: SALON,
    name: "Braids",
    duration_minutes: 90,
    price_type: "fixed",
    price: 500050,
    created_at: "2026-10-12T00:00:00Z",
    ...overrides,
  };
}

function renderSection(initial: Service[]) {
  return render(
    <QueryProvider>
      <ServicesSection salonId={SALON} initialServices={initial} />
    </QueryProvider>,
  );
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function openAdd() {
  fireEvent.click(screen.getByRole("button", { name: "Add a service" }));
}

beforeEach(() => refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("ServicesSection: list", () => {
  it("shows an empty state and the add button", () => {
    renderSection([]);
    expect(screen.getByText("No services yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add a service" }),
    ).toBeInTheDocument();
  });

  it("shows duration and naira, and 'Price on consultation' for a quote", () => {
    renderSection([
      service(),
      service({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        name: "Consult",
        price_type: "quote",
        price: null,
      }),
    ]);
    expect(screen.getByText(/1 hr 30 min · ₦5,000\.50/)).toBeInTheDocument();
    expect(
      screen.getByText(/Price on consultation/, { selector: "p" }),
    ).toBeInTheDocument();
  });

  it("gives every row's buttons a name that says which service", () => {
    renderSection([service()]);
    expect(
      screen.getByRole("button", { name: "Edit Braids" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Braids" }),
    ).toBeInTheDocument();
  });

  it("offers a retry when re-reading the list fails, keeping what it has", async () => {
    const api = routeFetch({
      [LIST]: () => json({ detail: "boom" }, 500),
      [CREATE]: () => json(service(), 201),
    });
    renderSection([service()]);
    openAdd();
    fill("Service name", "Nails");
    fill("Duration (minutes)", "30");
    fill("Price (₦)", "2000");
    api.calls.length = 0;
    fireEvent.click(screen.getByRole("button", { name: "Add service" }));

    expect(await screen.findByText(/could not refresh/i)).toBeInTheDocument();
    expect(screen.getByText("Braids")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(api.count(LIST)).toBeGreaterThan(1));
  });
});

describe("ServicesSection: add", () => {
  it("hides the price field for 'price confirmed in person' and sends no price", async () => {
    const api = routeFetch({
      [CREATE]: () => json(service(), 201),
      [LIST]: () => json([service()]),
    });
    renderSection([]);
    openAdd();
    expect(screen.getByLabelText("Price (₦)")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Price confirmed in person/));
    expect(screen.queryByLabelText("Price (₦)")).not.toBeInTheDocument();

    fill("Service name", "Consultation");
    fill("Duration (minutes)", "30");
    fireEvent.click(screen.getByRole("button", { name: "Add service" }));

    await waitFor(() => expect(api.count(CREATE)).toBe(1));
    expect(api.calls.find((c) => c.key === CREATE)?.body).toEqual({
      name: "Consultation",
      duration_minutes: 30,
      price_type: "quote",
    });
  });

  it("converts naira to kobo, then refreshes the list and the page", async () => {
    const api = routeFetch({
      [CREATE]: () => json(service(), 201),
      [LIST]: () => json([service()]),
    });
    renderSection([]);
    openAdd();
    fill("Service name", "Braids");
    fill("Duration (minutes)", "90");
    fill("Price (₦)", "5,000.50");
    fireEvent.click(screen.getByRole("button", { name: "Add service" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(api.calls.find((c) => c.key === CREATE)?.body).toEqual({
      name: "Braids",
      duration_minutes: 90,
      price_type: "fixed",
      price: 500050,
    });
    expect(api.count(LIST)).toBe(1);
    expect(await screen.findByText("Service added.")).toBeInTheDocument();
    expect(await screen.findByText("Braids")).toBeInTheDocument();
  });

  it("validates on the client and sends nothing", () => {
    const api = routeFetch({});
    renderSection([]);
    openAdd();
    fireEvent.click(screen.getByRole("button", { name: "Add service" }));
    expect(screen.getByText("Enter the service name.")).toBeInTheDocument();
    expect(screen.getByLabelText("Service name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(api.calls).toHaveLength(0);
  });

  it("puts the server's 422 field errors on the matching fields", async () => {
    routeFetch({
      [CREATE]: () =>
        json(
          {
            detail: [
              {
                loc: ["body", "name"],
                msg: "String should have at most 100 characters",
                type: "string_too_long",
              },
              {
                loc: ["body", "price"],
                msg: "Input should be less than or equal to 100000000",
                type: "less_than_equal",
              },
            ],
          },
          422,
        ),
    });
    renderSection([]);
    openAdd();
    fill("Service name", "Braids");
    fill("Duration (minutes)", "90");
    fill("Price (₦)", "5000");
    fireEvent.click(screen.getByRole("button", { name: "Add service" }));

    expect(
      await screen.findByText("String should have at most 100 characters"),
    ).toBeInTheDocument();
    // The kobo wording is replaced by a naira message.
    expect(screen.getByText(/Enter a price from ₦1 to/)).toBeInTheDocument();
    expect(screen.queryByText(/100000000/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add service" })).toBeEnabled();
  });

  it("sends one request when the button is tapped twice, and disables it meanwhile", async () => {
    let release: (r: Response) => void = () => {};
    const api = routeFetch({
      [CREATE]: () => new Promise<Response>((resolve) => (release = resolve)),
      [LIST]: () => json([service()]),
    });
    renderSection([]);
    openAdd();
    fill("Service name", "Braids");
    fill("Duration (minutes)", "90");
    fill("Price (₦)", "5000");

    const form = screen.getByLabelText("Service name").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(api.count(CREATE)).toBe(1);
    expect(screen.getByRole("button", { name: "Saving…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    release(json(service(), 201));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(api.count(CREATE)).toBe(1);
  });
});

describe("ServicesSection: edit", () => {
  it("sends only the changed field", async () => {
    const api = routeFetch({
      [`PATCH /api/proxy/services/${service().id}`]: () => json(service()),
      [LIST]: () => json([service()]),
    });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    fill("Service name", "Knotless braids");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(api.calls[0].body).toEqual({ name: "Knotless braids" });
  });

  it("switching to 'price confirmed in person' sends price: null with the type", async () => {
    const api = routeFetch({
      [`PATCH /api/proxy/services/${service().id}`]: () =>
        json(service({ price_type: "quote", price: null })),
      [LIST]: () => json([]),
    });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    fireEvent.click(screen.getByLabelText(/Price confirmed in person/));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(api.calls).toHaveLength(2));
    expect(api.calls[0].body).toEqual({ price_type: "quote", price: null });
  });

  it("switching a quote back to a fixed price works and asks for the price", async () => {
    const quote = service({ price_type: "quote", price: null });
    const api = routeFetch({
      [`PATCH /api/proxy/services/${quote.id}`]: () => json(service()),
      [LIST]: () => json([service()]),
    });
    renderSection([quote]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    fireEvent.click(screen.getByLabelText(/Fixed price/));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText(/Enter a price from ₦1 to/)).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);

    fill("Price (₦)", "2500");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.calls.length).toBeGreaterThan(0));
    expect(api.calls[0].body).toEqual({ price_type: "fixed", price: 250000 });
  });

  it("says so when nothing changed, without calling the API", () => {
    const api = routeFetch({});
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText(/Nothing to save/)).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });
});

describe("ServicesSection: delete", () => {
  const DELETE = `DELETE /api/proxy/services/${service().id}`;

  it("asks first, then deletes and refreshes", async () => {
    const api = routeFetch({ [DELETE]: noContent, [LIST]: () => json([]) });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    expect(screen.getByText("Delete Braids?")).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Delete service" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(api.count(DELETE)).toBe(1);
    expect(await screen.findByText("Braids was deleted.")).toBeInTheDocument();
  });

  it("explains a 409 as bookings and keeps the service", async () => {
    routeFetch({ [DELETE]: () => json({ detail: "has bookings" }, 409) });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete service" }));

    expect(
      await screen.findByText(
        "This has bookings, so it can't be deleted. Cancel or complete them first.",
      ),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getAllByText("Braids").length).toBeGreaterThan(0);
    // Nothing to retry for a 409: only Close is offered.
    expect(
      screen.queryByRole("button", { name: /Delete service|Try again/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
  });

  it("treats the live API's bare 500 as most likely bookings, and allows another try", async () => {
    routeFetch({
      [DELETE]: () => new Response("Internal Server Error", { status: 500 }),
    });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete service" }));

    expect(
      await screen.findByText(/This has bookings, so it can't be deleted/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("disables the buttons while sending and sends one request", async () => {
    let release: (r: Response) => void = () => {};
    const api = routeFetch({
      [DELETE]: () => new Promise<Response>((resolve) => (release = resolve)),
      [LIST]: () => json([]),
    });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    const confirm = screen.getByRole("button", { name: "Delete service" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(screen.getByRole("button", { name: "Deleting…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Keep service" })).toBeDisabled();
    expect(api.count(DELETE)).toBe(1);
    release(noContent());
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
