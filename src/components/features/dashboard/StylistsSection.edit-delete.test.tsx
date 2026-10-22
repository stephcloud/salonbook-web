import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import type { Service, Stylist } from "@/lib/api";
import { json, noContent, routeFetch } from "@/tests/route-fetch";
import { StylistsSection } from "./StylistsSection";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const SALON = "11111111-1111-4111-8111-111111111111";
const ADA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PHOTO = "https://x.com/ada.png";
const LIST_STYLISTS = `GET /api/proxy/salons/${SALON}/stylists`;
const LIST_SERVICES = `GET /api/proxy/salons/${SALON}/services`;
const PATCH = `PATCH /api/proxy/stylists/${ADA}`;
const DELETE = `DELETE /api/proxy/stylists/${ADA}`;
const GONE = "This stylist no longer exists. The list has been refreshed.";

function stylist(overrides: Partial<Stylist> = {}): Stylist {
  return {
    id: ADA,
    name: "Ada",
    image_url: null,
    service_ids: [],
    ...overrides,
  };
}

const SERVICES: Service[] = [];

/** The two list reads that follow any change, so a refresh never hits an unrouted request. */
function lists(after: Stylist[] = []) {
  return {
    [LIST_STYLISTS]: () => json(after),
    [LIST_SERVICES]: () => json(SERVICES),
  };
}

function renderSection(stylists: Stylist[] = [stylist()]) {
  return render(
    <QueryProvider>
      <StylistsSection
        salonId={SALON}
        initialServices={SERVICES}
        initialStylists={stylists}
      />
    </QueryProvider>,
  );
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function openEdit(name = "Ada") {
  fireEvent.click(screen.getByRole("button", { name: `Edit ${name}` }));
}

function save() {
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
}

function openDelete(name = "Ada") {
  fireEvent.click(screen.getByRole("button", { name: `Delete ${name}` }));
}

function confirmDelete() {
  fireEvent.click(screen.getByRole("button", { name: "Delete stylist" }));
}

function stubSignedOutLocation() {
  const assign = vi.fn();
  vi.stubGlobal("location", {
    ...window.location,
    assign,
    pathname: "/dashboard/stylists",
    search: "",
  });
  return assign;
}

const signedOut = () => json({ error: "Please sign in again." }, 401);

beforeEach(() => refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("StylistsSection: edit", () => {
  it("gives every card an Edit and a Delete button named after the stylist", () => {
    renderSection([stylist(), stylist({ id: "other", name: "Bea" })]);
    expect(screen.getByRole("button", { name: "Edit Ada" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete Ada" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Edit Bea" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete Bea" })).toBeEnabled();
  });

  it("opens a dialog with the current name and photo, and labelled fields", () => {
    renderSection([stylist({ image_url: PHOTO })]);
    openEdit();

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Edit Ada" }),
    ).toBeInTheDocument();
    const name = screen.getByLabelText("Stylist name");
    const photo = screen.getByLabelText("Photo link (optional)");
    expect(name).toHaveValue("Ada");
    expect(photo).toHaveValue(PHOTO);
    expect(name.tagName).toBe("INPUT");
    expect(photo.tagName).toBe("INPUT");
  });

  it("starts with an empty photo field when the stylist has no photo", () => {
    renderSection();
    openEdit();
    expect(screen.getByLabelText("Photo link (optional)")).toHaveValue("");
  });

  it("closes with Cancel and sends nothing", async () => {
    const api = routeFetch({});
    renderSection();
    openEdit();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(api.calls).toHaveLength(0);
  });

  it("asks for a name and sends nothing when the name is emptied", () => {
    const api = routeFetch({});
    renderSection();
    openEdit();
    fill("Stylist name", "   ");
    save();

    expect(screen.getByText("Enter the stylist's name.")).toBeInTheDocument();
    expect(screen.getByLabelText("Stylist name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(api.calls).toHaveLength(0);
  });

  it("asks for an https photo link and sends nothing for http", () => {
    const api = routeFetch({});
    renderSection();
    openEdit();
    fill("Photo link (optional)", "http://x");
    save();

    expect(
      screen.getByText("Start with https:// and leave out spaces."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Photo link (optional)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(api.calls).toHaveLength(0);
  });

  it("says there is nothing to save, and sends nothing, when nothing changed", () => {
    const api = routeFetch({});
    renderSection([stylist({ image_url: PHOTO })]);
    openEdit();
    // Only surrounding spaces differ, which counts as no change.
    fill("Stylist name", " Ada ");
    save();

    expect(
      screen.getByText("Nothing to save. You have not changed anything."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("sends only the changed name, then closes, announces it and re-reads the lists", async () => {
    const api = routeFetch({
      [PATCH]: () => json({ id: ADA, name: "Ada B", image_url: null }),
      ...lists([stylist({ name: "Ada B" })]),
    });
    renderSection();
    openEdit();
    fill("Stylist name", " Ada B ");
    save();

    expect(await screen.findByText("Ada B was saved.")).toBeInTheDocument();
    expect(api.calls.find((c) => c.key === PATCH)?.body).toEqual({
      name: "Ada B",
    });
    expect(api.count(PATCH)).toBe(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(api.count(LIST_STYLISTS)).toBeGreaterThan(0));
    expect(refresh).toHaveBeenCalled();
    expect(
      await screen.findByRole("heading", { name: "Ada B" }),
    ).toBeInTheDocument();
  });

  it("sends only the photo when a photo is added", async () => {
    const api = routeFetch({
      [PATCH]: () => json({ id: ADA, name: "Ada", image_url: PHOTO }),
      ...lists([stylist({ image_url: PHOTO })]),
    });
    renderSection();
    openEdit();
    fill("Photo link (optional)", PHOTO);
    save();

    expect(await screen.findByText("Ada was saved.")).toBeInTheDocument();
    expect(api.calls.find((c) => c.key === PATCH)?.body).toEqual({
      image_url: PHOTO,
    });
  });

  it("sends image_url null when the photo link is cleared", async () => {
    const api = routeFetch({
      [PATCH]: () => json({ id: ADA, name: "Ada", image_url: null }),
      ...lists([stylist()]),
    });
    renderSection([stylist({ image_url: PHOTO })]);
    openEdit();
    fill("Photo link (optional)", "");
    save();

    expect(await screen.findByText("Ada was saved.")).toBeInTheDocument();
    expect(api.calls.find((c) => c.key === PATCH)?.body).toEqual({
      image_url: null,
    });
  });

  it("sends one request when submitted twice, and disables the buttons meanwhile", async () => {
    let release: (r: Response) => void = () => {};
    const api = routeFetch({
      [PATCH]: () => new Promise<Response>((resolve) => (release = resolve)),
      ...lists([stylist({ name: "Ada B" })]),
    });
    renderSection();
    openEdit();
    fill("Stylist name", "Ada B");
    const form = screen.getByLabelText("Stylist name").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(api.count(PATCH)).toBe(1);
    expect(screen.getByRole("button", { name: "Saving…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    release(json({ id: ADA, name: "Ada B", image_url: null }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(api.count(PATCH)).toBe(1);
  });

  it("puts the server's 422 field error on the photo input and keeps the dialog open", async () => {
    routeFetch({
      [PATCH]: () =>
        json(
          {
            error: "Check the form.",
            detail: [{ loc: ["body", "image_url"], msg: "bad url" }],
          },
          422,
        ),
    });
    renderSection();
    openEdit();
    fill("Photo link (optional)", "https://x.com/a.png");
    save();

    expect(await screen.findByText("bad url")).toBeInTheDocument();
    expect(screen.getByLabelText("Photo link (optional)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Stylist name")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says the stylist is gone on a 404, closes the dialog, re-reads the lists and focuses the heading", async () => {
    const api = routeFetch({
      [PATCH]: () => json({ detail: "Stylist not found" }, 404),
      ...lists([]),
    });
    renderSection();
    openEdit();
    fill("Stylist name", "Ada B");
    save();

    expect(await screen.findByText(GONE)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(api.count(LIST_STYLISTS)).toBeGreaterThan(0));
    expect(refresh).toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Your stylists" }),
      ).toHaveFocus(),
    );
    await waitFor(() =>
      expect(screen.getByText("No stylists yet")).toBeInTheDocument(),
    );
  });

  it("shows a 403 in the dialog and keeps it open", async () => {
    routeFetch({ [PATCH]: () => json({ detail: "Forbidden" }, 403) });
    renderSection();
    openEdit();
    fill("Stylist name", "Ada B");
    save();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can only change stylists in your own salon.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("goes to /login?next= on a 401 and keeps the buttons locked", async () => {
    const assign = stubSignedOutLocation();
    routeFetch({ [PATCH]: signedOut });
    renderSection();
    openEdit();
    fill("Stylist name", "Ada B");
    save();

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "/login?next=%2Fdashboard%2Fstylists",
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toHaveAttribute("aria-disabled", "true"),
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("StylistsSection: delete", () => {
  it("asks for confirmation before sending anything", () => {
    const api = routeFetch({});
    renderSection();
    openDelete();

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByRole("heading", { name: "Delete Ada?" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/This cannot be undone/),
    ).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it("keeps the stylist and sends nothing on Keep stylist", async () => {
    const api = routeFetch({});
    renderSection();
    openDelete();
    fireEvent.click(screen.getByRole("button", { name: "Keep stylist" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(api.calls).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Edit Ada" }),
    ).toBeInTheDocument();
  });

  it("deletes, announces it and re-reads the lists", async () => {
    const api = routeFetch({
      [DELETE]: () => noContent(),
      ...lists([]),
    });
    renderSection();
    openDelete();
    confirmDelete();

    expect(await screen.findByText("Ada was deleted.")).toBeInTheDocument();
    expect(api.count(DELETE)).toBe(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(api.count(LIST_STYLISTS)).toBeGreaterThan(0));
    expect(refresh).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText("No stylists yet")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Your stylists" }),
      ).toHaveFocus(),
    );
  });

  it("sends one request when confirmed twice", async () => {
    let release: (r: Response) => void = () => {};
    const api = routeFetch({
      [DELETE]: () => new Promise<Response>((resolve) => (release = resolve)),
      ...lists([]),
    });
    renderSection();
    openDelete();
    const button = screen.getByRole("button", { name: "Delete stylist" });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "Deleting…" }));

    expect(api.count(DELETE)).toBe(1);
    release(noContent());
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(api.count(DELETE)).toBe(1);
  });

  it("explains a 409, hides the delete action and offers to edit instead", async () => {
    const api = routeFetch({
      [DELETE]: () => json({ detail: "Stylist has bookings" }, 409),
    });
    renderSection();
    openDelete();
    confirmDelete();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This stylist has bookings, so they can't be deleted. You can edit their name or photo instead.",
    );
    expect(screen.queryByRole("button", { name: "Delete stylist" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
    // The "cannot be undone" description would contradict the alert.
    expect(screen.queryByText(/This cannot be undone/)).toBeNull();

    // "Edit Ada" inside the dialog switches to the edit dialog.
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Edit Ada",
      }),
    );
    expect(await screen.findByLabelText("Stylist name")).toHaveValue("Ada");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(api.count(DELETE)).toBe(1);

    // Closing that edit returns focus to the card's own Edit button, not the page body.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit Ada" })).toHaveFocus(),
    );
  });

  it("says the stylist is gone on a 404, closes the dialog and re-reads the lists", async () => {
    const api = routeFetch({
      [DELETE]: () => json({ detail: "Stylist not found" }, 404),
      ...lists([]),
    });
    renderSection();
    openDelete();
    confirmDelete();

    expect(await screen.findByText(GONE)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(api.count(LIST_STYLISTS)).toBeGreaterThan(0));
    expect(refresh).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText("No stylists yet")).toBeInTheDocument(),
    );
  });

  it("shows a 403 without offering to try again", async () => {
    routeFetch({ [DELETE]: () => json({ detail: "Forbidden" }, 403) });
    renderSection();
    openDelete();
    confirmDelete();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can only delete stylists in your own salon.",
    );
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("goes to /login?next= on a 401 and offers no way to retry", async () => {
    const assign = stubSignedOutLocation();
    routeFetch({ [DELETE]: signedOut });
    renderSection();
    openDelete();
    confirmDelete();

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "/login?next=%2Fdashboard%2Fstylists",
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /Delete stylist|Try again/ }),
      ).toBeNull(),
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
