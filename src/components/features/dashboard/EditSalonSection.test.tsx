import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Salon } from "@/lib/api";
import { EditSalonSection } from "./EditSalonSection";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const SALON: Salon = {
  id: "11111111-1111-4111-8111-111111111111",
  owner_id: "22222222-2222-4222-8222-222222222222",
  name: "Pink Studio",
  address: "12 Admiralty Way, Lekki",
  phone: "08012345678",
  image_url: null,
  cancellation_hours: 24,
  deposit_amount: 500000,
  created_at: "2026-10-01T10:00:00Z",
};

beforeEach(() => refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("EditSalonSection", () => {
  it("starts closed, with only the Edit button", () => {
    render(<EditSalonSection salon={SALON} />);
    expect(
      screen.getByRole("button", { name: "Edit salon details" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Salon name")).toBeNull();
  });

  it("opens the form with the salon's values and moves focus to the first field", () => {
    render(<EditSalonSection salon={SALON} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit salon details" }));

    expect(screen.getByLabelText("Salon name")).toHaveValue("Pink Studio");
    expect(screen.getByLabelText("Salon name")).toHaveFocus();
    expect(screen.getByLabelText("Deposit (₦)")).toHaveValue("5000");
  });

  it("closes on Cancel, drops unsaved edits and returns focus to the button", () => {
    render(<EditSalonSection salon={SALON} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit salon details" }));
    fireEvent.change(screen.getByLabelText("Salon name"), {
      target: { value: "Changed" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    const button = screen.getByRole("button", { name: "Edit salon details" });
    expect(button).toHaveFocus();
    expect(screen.queryByLabelText("Salon name")).toBeNull();
    fireEvent.click(button);
    expect(screen.getByLabelText("Salon name")).toHaveValue("Pink Studio");
  });

  it("closes after a successful save and refreshes the page data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ...SALON, name: "New name" })),
    );
    render(<EditSalonSection salon={SALON} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit salon details" }));
    fireEvent.change(screen.getByLabelText("Salon name"), {
      target: { value: "New name" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByRole("button", { name: "Edit salon details" }),
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Salon name")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
  });

  it("does not bring back an old Saved message when the form is reopened and cancelled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ...SALON, name: "New name" })),
    );
    render(<EditSalonSection salon={SALON} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit salon details" }));
    fireEvent.change(screen.getByLabelText("Salon name"), {
      target: { value: "New name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Saved.");

    fireEvent.click(screen.getByRole("button", { name: "Edit salon details" }));

    expect(screen.getByLabelText("Salon name")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getAllByRole("status").at(-1)).toBeEmptyDOMElement();
  });

  it("does not say Saved after opening and cancelling without saving", () => {
    render(<EditSalonSection salon={SALON} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit salon details" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getAllByRole("status").at(-1)).toBeEmptyDOMElement();
  });

  it("does not refresh the page or say Saved when the save fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ detail: "Salon not found" }, { status: 404 }),
      ),
    );
    render(<EditSalonSection salon={SALON} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit salon details" }));
    fireEvent.change(screen.getByLabelText("Salon name"), {
      target: { value: "New name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("alert");

    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getAllByRole("status").at(-1)).toBeEmptyDOMElement();
  });

  it("stays open and shows the problem when the save fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ detail: "Salon not found" }, { status: 404 }),
      ),
    );
    render(<EditSalonSection salon={SALON} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit salon details" }));
    fireEvent.change(screen.getByLabelText("Salon name"), {
      target: { value: "New name" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not find this salon/i,
    );
    expect(screen.getByLabelText("Salon name")).toHaveValue("New name");
  });
});
