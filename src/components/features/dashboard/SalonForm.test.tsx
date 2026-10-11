import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Salon } from "@/lib/api";
import { SalonForm } from "./SalonForm";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const SALON: Salon = {
  id: "11111111-1111-4111-8111-111111111111",
  owner_id: "22222222-2222-4222-8222-222222222222",
  name: "Pink Studio",
  address: "12 Admiralty Way, Lekki",
  phone: "08012345678",
  image_url: "https://example.com/a.png",
  cancellation_hours: 24,
  deposit_amount: 500000,
  created_at: "2026-10-01T10:00:00Z",
};

function respond(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillCreateForm() {
  fill("Salon name", "Pink Studio");
  fill("Address", "12 Admiralty Way, Lekki");
  fill("Phone number", "08012345678");
  fill("Deposit (₦)", "5,000.50");
}

function submit(name: RegExp | string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

function bodyOf(fetchMock: ReturnType<typeof vi.fn>, call = 0): unknown {
  const init = fetchMock.mock.calls[call][1] as RequestInit;
  return JSON.parse(String(init.body));
}

beforeEach(() => {
  refresh.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("SalonForm: create", () => {
  it("labels every field and starts with 24 hours", () => {
    render(<SalonForm mode="create" />);
    for (const label of [
      "Salon name",
      "Address",
      "Phone number",
      "Photo link (optional)",
      "Free cancellation window (hours)",
      "Deposit (₦)",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(
      screen.getByLabelText("Free cancellation window (hours)"),
    ).toHaveValue("24");
    expect(screen.getByRole("button", { name: "Create salon" })).toBeEnabled();
  });

  it("shows client errors, focuses the first bad field and sends nothing", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SalonForm mode="create" />);

    submit("Create salon");

    expect(screen.getByText("Enter the salon name.")).toBeInTheDocument();
    expect(screen.getByText("Enter the salon address.")).toBeInTheDocument();
    expect(screen.getByText("Enter a phone number.")).toBeInTheDocument();
    expect(screen.getByLabelText("Deposit (₦)")).toHaveAccessibleDescription(
      /Enter an amount from ₦1/,
    );
    expect(screen.getByLabelText("Salon name")).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the deposit in kobo as you type", () => {
    render(<SalonForm mode="create" />);
    fill("Deposit (₦)", "5000.5");
    expect(screen.getByText(/₦5,000\.50 is 500,050 kobo/)).toBeInTheDocument();
  });

  it("sends the deposit in kobo, leaves out an empty photo and refreshes the page", async () => {
    const fetchMock = vi.fn(async () => respond(SALON, 201));
    vi.stubGlobal("fetch", fetchMock);
    render(<SalonForm mode="create" />);
    fillCreateForm();

    submit("Create salon");

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/proxy/salons");
    expect(init.method).toBe("POST");
    expect(bodyOf(fetchMock)).toEqual({
      name: "Pink Studio",
      address: "12 Admiralty Way, Lekki",
      phone: "08012345678",
      cancellation_hours: 24,
      deposit_amount: 500050,
    });
  });

  it("stays locked after creating so the form cannot be sent twice", async () => {
    const fetchMock = vi.fn(async () => respond(SALON, 201));
    vi.stubGlobal("fetch", fetchMock);
    render(<SalonForm mode="create" />);
    fillCreateForm();
    submit("Create salon");
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());

    expect(screen.getByRole("button", { name: "Create salon" })).toBeDisabled();
    fireEvent.submit(
      screen.getByRole("button", { name: "Create salon" }).closest("form")!,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends one request when the form is submitted twice quickly", async () => {
    let finish: (value: Response) => void = () => {};
    const fetchMock = vi.fn(
      () => new Promise<Response>((resolve) => (finish = resolve)),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SalonForm mode="create" />);
    fillCreateForm();
    const form = screen
      .getByRole("button", { name: "Create salon" })
      .closest("form")!;

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    await act(async () => finish(respond(SALON, 201)));
  });

  it("puts the server's 422 field errors on the matching fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respond(
          {
            detail: [
              {
                loc: ["body", "name"],
                msg: "String should have at most 100 characters",
              },
              {
                loc: ["body", "image_url"],
                msg: "String should match pattern",
              },
            ],
          },
          422,
        ),
      ),
    );
    render(<SalonForm mode="create" />);
    fillCreateForm();

    submit("Create salon");

    expect(
      await screen.findByText("String should have at most 100 characters"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Salon name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByLabelText("Photo link (optional)"),
    ).toHaveAccessibleDescription("String should match pattern");
    expect(refresh).not.toHaveBeenCalled();
    // The form can be corrected and sent again.
    expect(screen.getByRole("button", { name: "Create salon" })).toBeEnabled();
  });

  it("explains a server deposit error in naira, not kobo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respond(
          {
            detail: [
              {
                loc: ["body", "deposit_amount"],
                msg: "Input should be less than or equal to 100000000",
              },
            ],
          },
          422,
        ),
      ),
    );
    render(<SalonForm mode="create" />);
    fillCreateForm();

    submit("Create salon");

    expect(
      await screen.findByText(/Enter an amount from ₦1/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/100000000/)).toBeNull();
  });

  it("tells a client that only owners can create a salon (403)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond({ detail: "Owners only" }, 403)),
    );
    render(<SalonForm mode="create" />);
    fillCreateForm();

    submit("Create salon");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only salon owners can create a salon.",
    );
  });

  it("hides the text of a 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respond({ detail: "Traceback (most recent call last)" }, 500),
      ),
    );
    render(<SalonForm mode="create" />);
    fillCreateForm();

    submit("Create salon");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong on our side");
    expect(alert).not.toHaveTextContent("Traceback");
  });

  it("stays quiet and locked on a 401 because the browser is going to the sign-in page", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      assign,
      pathname: "/dashboard",
      search: "",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond({ error: "Please sign in again." }, 401)),
    );
    render(<SalonForm mode="create" />);
    fillCreateForm();

    submit("Create salon");

    await vi.waitFor(() =>
      expect(assign).toHaveBeenCalledWith("/login?next=%2Fdashboard"),
    );
    expect(screen.getByRole("button", { name: "Create salon" })).toBeDisabled();
  });

  it("allows another try after a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );
    render(<SalonForm mode="create" />);
    fillCreateForm();

    submit("Create salon");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the server",
    );
    expect(screen.getByRole("button", { name: "Create salon" })).toBeEnabled();
  });

  it("shows the waking-up message when the server is slow", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    render(<SalonForm mode="create" />);
    fillCreateForm();

    submit("Create salon");
    expect(screen.queryByText(/Waking up the server/)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /Waking up the server/,
    );
  });
});

describe("SalonForm: edit", () => {
  it("starts with the salon's values, with the deposit in naira", () => {
    render(<SalonForm mode="edit" salon={SALON} />);
    expect(screen.getByLabelText("Salon name")).toHaveValue("Pink Studio");
    expect(screen.getByLabelText("Address")).toHaveValue(
      "12 Admiralty Way, Lekki",
    );
    expect(screen.getByLabelText("Phone number")).toHaveValue("08012345678");
    expect(screen.getByLabelText("Photo link (optional)")).toHaveValue(
      "https://example.com/a.png",
    );
    expect(
      screen.getByLabelText("Free cancellation window (hours)"),
    ).toHaveValue("24");
    expect(screen.getByLabelText("Deposit (₦)")).toHaveValue("5000");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("sends nothing when nothing changed", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SalonForm mode="edit" salon={SALON} />);

    submit("Save changes");

    expect(screen.getByRole("status")).toHaveTextContent("Nothing to save");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("PATCHes only what changed, then says Saved, refreshes and calls onSaved", async () => {
    const onSaved = vi.fn();
    const fetchMock = vi.fn(async () =>
      respond({ ...SALON, phone: "0700000000" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SalonForm mode="edit" salon={SALON} onSaved={onSaved} />);
    fill("Phone number", "0700000000");
    fill("Deposit (₦)", "7,500");

    submit("Save changes");

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`/api/proxy/salons/${SALON.id}`);
    expect(init.method).toBe("PATCH");
    expect(bodyOf(fetchMock)).toEqual({
      phone: "0700000000",
      deposit_amount: 750000,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("clears the photo with an explicit null when the link is emptied", async () => {
    const fetchMock = vi.fn(async () => respond({ ...SALON, image_url: null }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SalonForm mode="edit" salon={SALON} />);
    fill("Photo link (optional)", "");

    submit("Save changes");

    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(bodyOf(fetchMock)).toEqual({ image_url: null });
  });

  it("sends one request when submitted twice quickly", async () => {
    let finish: (value: Response) => void = () => {};
    const fetchMock = vi.fn(
      () => new Promise<Response>((resolve) => (finish = resolve)),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SalonForm mode="edit" salon={SALON} />);
    fill("Salon name", "New name");
    const form = screen
      .getByRole("button", { name: "Save changes" })
      .closest("form")!;

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => finish(respond(SALON)));
  });

  it("maps a 422 to the field and keeps what the owner typed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respond(
          {
            detail: [
              {
                loc: ["body", "phone"],
                msg: "String should have at least 3 characters",
              },
            ],
          },
          422,
        ),
      ),
    );
    render(<SalonForm mode="edit" salon={SALON} />);
    fill("Phone number", "0700000000");

    submit("Save changes");

    expect(
      await screen.findByText("String should have at least 3 characters"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Phone number")).toHaveValue("0700000000");
  });

  it("explains a 404 (the salon is gone) and a 403 (not yours)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond({ detail: "Salon not found" }, 404))
      .mockResolvedValueOnce(respond({ detail: "Not your salon" }, 403));
    vi.stubGlobal("fetch", fetchMock);
    render(<SalonForm mode="edit" salon={SALON} />);
    fill("Salon name", "New name");

    submit("Save changes");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not find this salon/i,
    );

    submit("Save changes");
    await vi.waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "You can only edit your own salon.",
      ),
    );
  });

  it("offers Cancel only when given onCancel, and it does not send anything", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const onCancel = vi.fn();
    const { rerender } = render(<SalonForm mode="edit" salon={SALON} />);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

    rerender(<SalonForm mode="edit" salon={SALON} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
