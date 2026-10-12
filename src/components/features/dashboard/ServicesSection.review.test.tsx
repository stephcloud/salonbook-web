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
const BRAIDS: Service = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  salon_id: SALON,
  name: "Braids",
  duration_minutes: 90,
  price_type: "fixed",
  price: 500050,
  created_at: "2026-10-12T00:00:00Z",
};
const DELETE = `DELETE /api/proxy/services/${BRAIDS.id}`;

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

function fillValidAndSubmit() {
  fireEvent.click(screen.getByRole("button", { name: "Add a service" }));
  fill("Service name", "Braids");
  fill("Duration (minutes)", "90");
  fill("Price (₦)", "5000");
  fireEvent.click(screen.getByRole("button", { name: "Add service" }));
}

beforeEach(() => refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("ServicesSection: errors the form cannot show next to a field", () => {
  it("shows a price_type error from the API as the form message", async () => {
    routeFetch({
      [CREATE]: () =>
        json(
          {
            detail: [
              {
                loc: ["body", "price_type"],
                msg: "Input should be 'fixed' or 'quote'",
                type: "enum",
              },
            ],
          },
          422,
        ),
    });
    renderSection([]);
    fillValidAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Input should be 'fixed' or 'quote'",
    );
  });

  it("shows a hidden price error as the form message while a quote is chosen", async () => {
    routeFetch({
      [CREATE]: () =>
        json({ detail: "price must be null when price_type is quote" }, 422),
    });
    renderSection([]);
    fireEvent.click(screen.getByRole("button", { name: "Add a service" }));
    fireEvent.click(screen.getByLabelText(/Price confirmed in person/));
    fill("Service name", "Consult");
    fill("Duration (minutes)", "30");
    fireEvent.click(screen.getByRole("button", { name: "Add service" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "price must be null when price_type is quote",
    );
  });

  it("says a 403 means it is not their salon", async () => {
    routeFetch({ [CREATE]: () => json({ detail: "forbidden" }, 403) });
    renderSection([]);
    fillValidAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /your own salon/,
    );
  });

  it("disables the fields while sending", async () => {
    routeFetch({ [CREATE]: () => new Promise<Response>(() => {}) });
    renderSection([]);
    fillValidAndSubmit();
    await screen.findByRole("button", { name: "Saving…" });
    expect(screen.getByLabelText("Service name")).toBeDisabled();
    expect(screen.getByLabelText("Duration (minutes)")).toBeDisabled();
    expect(screen.getByLabelText("Price (₦)")).toBeDisabled();
  });
});

describe("ServicesSection: focus and announcements", () => {
  it("puts focus on the heading after a delete, since the Delete button is gone", async () => {
    routeFetch({ [DELETE]: noContent, [LIST]: () => json([]) });
    renderSection([BRAIDS]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete service" }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "Your services" }),
      ),
    );
  });

  it("moves focus to the message when a delete is refused", async () => {
    routeFetch({ [DELETE]: () => json({ detail: "x" }, 409) });
    renderSection([BRAIDS]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete service" }));
    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });

  it("keeps the pressed button focusable while the request is on its way", async () => {
    routeFetch({ [CREATE]: () => new Promise<Response>(() => {}) });
    renderSection([]);
    fillValidAndSubmit();
    const saving = await screen.findByRole("button", { name: "Saving…" });
    expect(saving).toHaveAttribute("aria-disabled", "true");
    expect(saving).not.toHaveAttribute("disabled");
  });
});
