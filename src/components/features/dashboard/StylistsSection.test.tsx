import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import type { Service, Stylist } from "@/lib/api";
import { json, routeFetch } from "@/tests/route-fetch";
import { StylistsSection } from "./StylistsSection";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const SALON = "11111111-1111-4111-8111-111111111111";
const BRAIDS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NAILS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ADA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CREATE = "POST /api/dashboard/stylists";
const LIST_STYLISTS = `GET /api/proxy/salons/${SALON}/stylists`;
const LIST_SERVICES = `GET /api/proxy/salons/${SALON}/services`;
const ASSIGN = `PUT /api/proxy/stylists/${ADA}/services`;

function service(id: string, name: string): Service {
  return {
    id,
    salon_id: SALON,
    name,
    duration_minutes: 60,
    price_type: "fixed",
    price: 500000,
    created_at: "2026-10-12T00:00:00Z",
  };
}

const SERVICES = [service(BRAIDS, "Braids"), service(NAILS, "Nails")];

function stylist(overrides: Partial<Stylist> = {}): Stylist {
  return {
    id: ADA,
    name: "Ada",
    image_url: null,
    service_ids: [],
    ...overrides,
  };
}

function renderSection(services: Service[], stylists: Stylist[]) {
  return render(
    <QueryProvider>
      <StylistsSection
        salonId={SALON}
        initialServices={services}
        initialStylists={stylists}
      />
    </QueryProvider>,
  );
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function openAdd() {
  fireEvent.click(screen.getByRole("button", { name: "Add a stylist" }));
}

function tick(name: string) {
  fireEvent.click(
    screen.getByRole("checkbox", { name: new RegExp(`^${name}`) }),
  );
}

beforeEach(() => refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("StylistsSection: list", () => {
  it("shows an empty state", () => {
    renderSection(SERVICES, []);
    expect(screen.getByText("No stylists yet")).toBeInTheDocument();
  });

  it("shows an initial avatar and the services each stylist offers", () => {
    renderSection(SERVICES, [stylist({ service_ids: [BRAIDS, NAILS] })]);
    expect(screen.getByTestId("stylist-initial")).toHaveTextContent("A");
    expect(screen.getByText("Braids, Nails")).toBeInTheDocument();
    expect(screen.queryByText(/can't book this stylist/)).toBeNull();
  });

  it("flags a stylist with no services", () => {
    renderSection(SERVICES, [stylist()]);
    expect(
      screen.getByText(/Clients can't book this stylist until you assign a/),
    ).toBeInTheDocument();
  });

  it("flags a stylist whose only services no longer exist", () => {
    renderSection(SERVICES, [stylist({ service_ids: ["gone"] })]);
    expect(screen.getByText(/can't book this stylist/)).toBeInTheDocument();
  });
});

describe("StylistsSection: add", () => {
  it("explains that services come first when the salon has none", () => {
    renderSection([], []);
    openAdd();
    expect(screen.getByText(/Add a service first/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to services" }),
    ).toHaveAttribute("href", "/dashboard/services");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("labels every field and every checkbox", () => {
    renderSection(SERVICES, []);
    openAdd();
    expect(screen.getByLabelText("Stylist name")).toBeInTheDocument();
    expect(screen.getByLabelText("Photo link (optional)")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Braids/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Nails/ })).toBeInTheDocument();
  });

  it("creates the stylist without credentials, assigns the ticked services, then refreshes", async () => {
    const api = routeFetch({
      [CREATE]: () => json({ id: ADA, name: "Ada", image_url: null }, 201),
      [ASSIGN]: () => json({ stylist_id: ADA, service_ids: [BRAIDS] }),
      [LIST_STYLISTS]: () => json([stylist({ service_ids: [BRAIDS] })]),
      [LIST_SERVICES]: () => json(SERVICES),
    });
    renderSection(SERVICES, []);
    openAdd();
    fill("Stylist name", " Ada ");
    tick("Braids");
    fireEvent.click(screen.getByRole("button", { name: "Add stylist" }));

    expect(await screen.findByText("Ada was added.")).toBeInTheDocument();
    // The browser sends only the salon and name: never an email or password.
    expect(api.calls.find((c) => c.key === CREATE)?.body).toEqual({
      salon_id: SALON,
      name: "Ada",
    });
    expect(api.calls.find((c) => c.key === ASSIGN)?.body).toEqual({
      service_ids: [BRAIDS],
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("adds a stylist with no services and says clients cannot book them yet", async () => {
    const api = routeFetch({
      [CREATE]: () => json({ id: ADA, name: "Ada", image_url: null }, 201),
      [LIST_STYLISTS]: () => json([stylist()]),
      [LIST_SERVICES]: () => json(SERVICES),
    });
    renderSection(SERVICES, []);
    openAdd();
    fill("Stylist name", "Ada");
    fireEvent.click(screen.getByRole("button", { name: "Add stylist" }));

    expect(
      await screen.findByText(/Ada was added\. Assign a service/),
    ).toBeInTheDocument();
    expect(api.count(ASSIGN)).toBe(0);
  });

  it("validates on the client and sends nothing", () => {
    const api = routeFetch({});
    renderSection(SERVICES, []);
    openAdd();
    fill("Photo link (optional)", "http://x.com/a.png");
    fireEvent.click(screen.getByRole("button", { name: "Add stylist" }));
    expect(screen.getByText("Enter the stylist's name.")).toBeInTheDocument();
    expect(
      screen.getByText("Start with https:// and leave out spaces."),
    ).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it("puts the server's 422 field errors on the matching fields", async () => {
    routeFetch({
      [CREATE]: () =>
        json(
          {
            error: "Check the form.",
            detail: [
              {
                loc: ["body", "image_url"],
                msg: "String should match pattern",
              },
            ],
          },
          422,
        ),
    });
    renderSection(SERVICES, []);
    openAdd();
    fill("Stylist name", "Ada");
    fill("Photo link (optional)", "https://x.com/a.png");
    fireEvent.click(screen.getByRole("button", { name: "Add stylist" }));

    expect(
      await screen.findByText("String should match pattern"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Photo link (optional)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("sends one create request when submitted twice, and disables the buttons", async () => {
    let release: (r: Response) => void = () => {};
    const api = routeFetch({
      [CREATE]: () => new Promise<Response>((resolve) => (release = resolve)),
      [LIST_STYLISTS]: () => json([stylist()]),
      [LIST_SERVICES]: () => json(SERVICES),
    });
    renderSection(SERVICES, []);
    openAdd();
    fill("Stylist name", "Ada");
    const form = screen.getByLabelText("Stylist name").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(api.count(CREATE)).toBe(1);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    release(json({ id: ADA, name: "Ada", image_url: null }, 201));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(api.count(CREATE)).toBe(1);
  });

  describe("when the stylist is created but saving services fails", () => {
    async function reachPartialFailure() {
      let assignAttempts = 0;
      const api = routeFetch({
        [CREATE]: () => json({ id: ADA, name: "Ada", image_url: null }, 201),
        [ASSIGN]: () => {
          assignAttempts += 1;
          return assignAttempts === 1
            ? json({ detail: "boom" }, 500)
            : json({ stylist_id: ADA, service_ids: [BRAIDS] });
        },
        [LIST_STYLISTS]: () => json([stylist({ service_ids: [BRAIDS] })]),
        [LIST_SERVICES]: () => json(SERVICES),
      });
      renderSection(SERVICES, []);
      openAdd();
      fill("Stylist name", "Ada");
      tick("Braids");
      fireEvent.click(screen.getByRole("button", { name: "Add stylist" }));
      await screen.findByRole("alert");
      return api;
    }

    it("says the stylist was added and the services were not saved", async () => {
      await reachPartialFailure();
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Ada was added, but their services were not saved/,
      );
      // The stylist exists, so the lists were re-read.
      expect(refresh).toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: "Save services again" }),
      ).toBeEnabled();
    });

    it("retries only the services, never creating the stylist twice", async () => {
      const api = await reachPartialFailure();
      expect(screen.queryByLabelText("Stylist name")).toBeNull();

      fireEvent.click(
        screen.getByRole("button", { name: "Save services again" }),
      );
      expect(await screen.findByText("Ada was added.")).toBeInTheDocument();
      expect(api.count(CREATE)).toBe(1);
      expect(api.count(ASSIGN)).toBe(2);
    });
  });
});

describe("StylistsSection: assign services", () => {
  it("starts from the services the stylist already offers", () => {
    renderSection(SERVICES, [stylist({ service_ids: [NAILS] })]);
    fireEvent.click(screen.getByRole("button", { name: "Services for Ada" }));
    expect(screen.getByRole("checkbox", { name: /Braids/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Nails/ })).toBeChecked();
  });

  it("saves the new set, then refreshes", async () => {
    const api = routeFetch({
      [ASSIGN]: () => json({ stylist_id: ADA, service_ids: [NAILS, BRAIDS] }),
      [LIST_STYLISTS]: () => json([stylist({ service_ids: [NAILS, BRAIDS] })]),
      [LIST_SERVICES]: () => json(SERVICES),
    });
    renderSection(SERVICES, [stylist({ service_ids: [NAILS] })]);
    fireEvent.click(screen.getByRole("button", { name: "Services for Ada" }));
    tick("Braids");
    fireEvent.click(screen.getByRole("button", { name: "Save services" }));

    expect(
      await screen.findByText("Services saved for Ada."),
    ).toBeInTheDocument();
    expect(api.calls.find((c) => c.key === ASSIGN)?.body).toEqual({
      service_ids: [NAILS, BRAIDS],
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("can untick everything, and warns that clients cannot book then", async () => {
    const api = routeFetch({
      [ASSIGN]: () => json({ stylist_id: ADA, service_ids: [] }),
      [LIST_STYLISTS]: () => json([stylist()]),
      [LIST_SERVICES]: () => json(SERVICES),
    });
    renderSection(SERVICES, [stylist({ service_ids: [NAILS] })]);
    fireEvent.click(screen.getByRole("button", { name: "Services for Ada" }));
    tick("Nails");
    expect(
      screen.getByText(/clients cannot book this stylist/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save services" }));
    await waitFor(() => expect(api.count(ASSIGN)).toBe(1));
    expect(api.calls.find((c) => c.key === ASSIGN)?.body).toEqual({
      service_ids: [],
    });
  });

  it("shows the failure and keeps the dialog open", async () => {
    routeFetch({
      [ASSIGN]: () =>
        json(
          { detail: "all services must belong to the stylist's salon" },
          422,
        ),
    });
    renderSection(SERVICES, [stylist()]);
    fireEvent.click(screen.getByRole("button", { name: "Services for Ada" }));
    tick("Braids");
    fireEvent.click(screen.getByRole("button", { name: "Save services" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no longer in this salon/,
    );
    expect(screen.getByRole("button", { name: "Save services" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("explains that services come first when there are none", () => {
    renderSection([], [stylist()]);
    fireEvent.click(screen.getByRole("button", { name: "Services for Ada" }));
    expect(screen.getByText(/Add a service first/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save services" })).toBeNull();
  });

  it("sends one request when submitted twice", async () => {
    let release: (r: Response) => void = () => {};
    const api = routeFetch({
      [ASSIGN]: () => new Promise<Response>((resolve) => (release = resolve)),
      [LIST_STYLISTS]: () => json([stylist()]),
      [LIST_SERVICES]: () => json(SERVICES),
    });
    renderSection(SERVICES, [stylist()]);
    fireEvent.click(screen.getByRole("button", { name: "Services for Ada" }));
    tick("Braids");
    const form = screen
      .getByRole("button", { name: "Save services" })
      .closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(api.count(ASSIGN)).toBe(1);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    release(json({ stylist_id: ADA, service_ids: [BRAIDS] }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
