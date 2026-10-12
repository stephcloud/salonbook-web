import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
const WAKING = /Waking up the server/;

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

const PATCH = `PATCH /api/proxy/services/${service().id}`;
const DELETE = `DELETE /api/proxy/services/${service().id}`;

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

function submitNewService() {
  fireEvent.click(screen.getByRole("button", { name: "Add a service" }));
  fill("Service name", "Lashes");
  fill("Duration (minutes)", "45");
  fill("Price (₦)", "3000");
  fireEvent.click(screen.getByRole("button", { name: "Add service" }));
}

function stubSignedOutLocation() {
  const assign = vi.fn();
  vi.stubGlobal("location", {
    ...window.location,
    assign,
    pathname: "/dashboard/services",
    search: "",
  });
  return assign;
}

const signedOut = () => json({ error: "Please sign in again." }, 401);

beforeEach(() => refresh.mockReset());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ServicesSection dialogs: signed out", () => {
  it("add: goes to /login?next= and keeps the buttons locked", async () => {
    const assign = stubSignedOutLocation();
    routeFetch({ [CREATE]: signedOut });
    renderSection([]);
    submitNewService();

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "/login?next=%2Fdashboard%2Fservices",
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add service" }),
      ).toHaveAttribute("aria-disabled", "true"),
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("edit: goes to /login?next= and keeps the buttons locked", async () => {
    const assign = stubSignedOutLocation();
    routeFetch({ [PATCH]: signedOut });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    fill("Service name", "Knotless");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(assign).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toHaveAttribute("aria-disabled", "true"),
    );
  });

  it("delete: goes to /login?next= and offers no way to retry", async () => {
    const assign = stubSignedOutLocation();
    routeFetch({ [DELETE]: signedOut });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete service" }));

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "/login?next=%2Fdashboard%2Fservices",
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /Delete service|Try again/ }),
      ).toBeNull(),
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
  });
});

describe("ServicesSection dialogs: not found", () => {
  it("edit: says the service may have been deleted and allows closing", async () => {
    routeFetch({ [PATCH]: () => json({ detail: "Service not found" }, 404) });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    fill("Service name", "Knotless");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not find this service/,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("delete: says it is already gone and keeps the dialog open", async () => {
    routeFetch({ [DELETE]: () => json({ detail: "Not found" }, 404) });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete service" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already gone/);
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("ServicesSection dialogs: slow server", () => {
  it("add: says the server is waking up only after 4 seconds", async () => {
    vi.useFakeTimers();
    routeFetch({ [CREATE]: () => new Promise<Response>(() => {}) });
    renderSection([]);
    submitNewService();
    await act(async () => {});

    expect(screen.queryByText(WAKING)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3999);
    });
    expect(screen.queryByText(WAKING)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText(WAKING)).toBeInTheDocument();
  });

  it("delete: says the server is waking up after 4 seconds", async () => {
    vi.useFakeTimers();
    routeFetch({ [DELETE]: () => new Promise<Response>(() => {}) });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete service" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(screen.getByText(WAKING)).toBeInTheDocument();
  });
});

describe("ServicesSection dialogs: cannot be dismissed while sending", () => {
  it("add: Escape does not close the dialog during a request", async () => {
    routeFetch({ [CREATE]: () => new Promise<Response>(() => {}) });
    renderSection([]);
    submitNewService();
    await screen.findByRole("button", { name: "Saving…" });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("delete: Escape does not close the dialog during a request", async () => {
    routeFetch({ [DELETE]: () => new Promise<Response>(() => {}) });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete service" }));
    await screen.findByRole("button", { name: "Deleting…" });

    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("add: Escape closes the dialog when nothing is being sent", async () => {
    routeFetch({});
    renderSection([]);
    fireEvent.click(screen.getByRole("button", { name: "Add a service" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("ServicesSection dialogs: edit form", () => {
  it("cancelling an edit and reopening shows the saved values again", async () => {
    routeFetch({});
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    fill("Service name", "Something else");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    expect(screen.getByLabelText("Service name")).toHaveValue("Braids");
  });

  it("starts empty when adding after an edit was cancelled", async () => {
    routeFetch({});
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Add a service" }));
    expect(screen.getByLabelText("Service name")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Add service" })).toBeVisible();
  });

  it("editing a quote service shows no price field and the quote choice selected", () => {
    routeFetch({});
    renderSection([service({ price_type: "quote", price: null })]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    expect(screen.queryByLabelText("Price (₦)")).toBeNull();
    expect(screen.getByLabelText(/Price confirmed in person/)).toBeChecked();
    expect(screen.getByLabelText("Service name")).toHaveValue("Braids");
  });

  it("editing a fixed service shows the price in naira", () => {
    routeFetch({});
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Braids" }));
    expect(screen.getByLabelText("Price (₦)")).toHaveValue("5000.50");
  });
});

describe("ServicesSection dialogs: refresh after a successful save", () => {
  it("closes the dialog after a delete", async () => {
    routeFetch({ [DELETE]: noContent, [LIST]: () => json([]) });
    renderSection([service()]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Braids" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete service" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});
