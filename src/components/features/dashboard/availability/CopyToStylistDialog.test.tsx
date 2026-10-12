import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import type { Stylist } from "@/lib/api";
import type { DayDraft } from "@/lib/availability/draft";
import { json, routeFetch } from "@/tests/route-fetch";
import { CopyToStylistDialog } from "./CopyToStylistDialog";

const BEA = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CAL = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const GET_BEA = `GET /api/proxy/stylists/${BEA}/availability`;
const PUT_BEA = `PUT /api/proxy/stylists/${BEA}/availability`;
const GET_CAL = `GET /api/proxy/stylists/${CAL}/availability`;
const PUT_CAL = `PUT /api/proxy/stylists/${CAL}/availability`;

const OTHERS: Stylist[] = [
  { id: BEA, name: "Bea", image_url: null, service_ids: [] },
  { id: CAL, name: "Cal", image_url: null, service_ids: [] },
];

const DAYS: DayDraft[] = Array.from({ length: 7 }, (_, i) => ({
  open: i === 0,
  start: 540,
  end: 1020,
  breaks: [],
}));

function setup() {
  const onClose = vi.fn();
  const onCopied = vi.fn();
  render(
    <QueryProvider>
      <CopyToStylistDialog
        open
        sourceName="Ada"
        others={OTHERS}
        days={DAYS}
        daysOff={[]}
        onClose={onClose}
        onCopied={onCopied}
      />
    </QueryProvider>,
  );
  return { onClose, onCopied };
}

const isOff = (el: HTMLElement) =>
  el.getAttribute("aria-disabled") === "true" ||
  (el as HTMLButtonElement).disabled;
const confirmBox = (name: string) =>
  screen.getByRole("checkbox", { name: `Yes, replace ${name}'s hours` });
const copyButton = () =>
  screen.getByRole("button", { name: /^Copy hours$|^Copying/ });
const empty = (id: string) => ({ stylist_id: id, rules: [] });

afterEach(() => vi.unstubAllGlobals());

describe("CopyToStylistDialog", () => {
  it("will not send anything until the replacement is confirmed", () => {
    const api = routeFetch({});
    setup();
    expect(isOff(copyButton())).toBe(true);
    fireEvent.click(copyButton());
    expect(api.calls).toHaveLength(0);
  });

  it("asks again when a different stylist is picked", () => {
    setup();
    fireEvent.click(confirmBox("Bea"));
    expect(isOff(copyButton())).toBe(false);
    fireEvent.change(screen.getByLabelText("Copy to"), {
      target: { value: CAL },
    });
    expect(isOff(copyButton())).toBe(true);
    expect(confirmBox("Cal")).not.toBeChecked();
  });

  it("copies to the stylist that was picked and reports it", async () => {
    const api = routeFetch({
      [GET_CAL]: () => json(empty(CAL)),
      [PUT_CAL]: () => json(empty(CAL)),
    });
    const { onCopied } = setup();
    fireEvent.change(screen.getByLabelText("Copy to"), {
      target: { value: CAL },
    });
    fireEvent.click(confirmBox("Cal"));
    fireEvent.click(copyButton());
    await waitFor(() =>
      expect(onCopied).toHaveBeenCalledWith("Hours copied to Cal."),
    );
    expect(api.count(PUT_CAL)).toBe(1);
    expect(api.count(PUT_BEA)).toBe(0);
  });

  it("says days off are kept, then that they are replaced when ticked", () => {
    setup();
    expect(screen.getByText(/but keeps their days off/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Also copy Ada's days off/ }),
    );
    expect(screen.getByText(/and days off\./)).toBeInTheDocument();
  });

  describe("while the copy is running", () => {
    function hang() {
      let finish: () => void = () => {};
      const api = routeFetch({
        [GET_BEA]: () => json(empty(BEA)),
        [PUT_BEA]: () =>
          new Promise<Response>((resolve) => {
            finish = () => resolve(json(empty(BEA)));
          }),
      });
      return { api, finish: () => finish() };
    }

    it("locks Cancel and the fields, and ignores Escape", async () => {
      const { api, finish } = hang();
      const { onClose, onCopied } = setup();
      fireEvent.click(confirmBox("Bea"));
      fireEvent.click(copyButton());
      await waitFor(() => expect(api.count(PUT_BEA)).toBe(1));

      expect(
        screen.getByRole("button", { name: "Copying…" }),
      ).toBeInTheDocument();
      expect(isOff(screen.getByRole("button", { name: "Cancel" }))).toBe(true);
      expect(screen.getByLabelText("Copy to")).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();

      finish();
      await waitFor(() => expect(onCopied).toHaveBeenCalledTimes(1));
    });

    it("sends only one request however often Copy hours is pressed", async () => {
      const { api, finish } = hang();
      const { onCopied } = setup();
      fireEvent.click(confirmBox("Bea"));
      fireEvent.click(copyButton());
      fireEvent.click(copyButton());
      await waitFor(() => expect(api.count(PUT_BEA)).toBe(1));
      finish();
      await waitFor(() => expect(onCopied).toHaveBeenCalledTimes(1));
      expect(api.count(PUT_BEA)).toBe(1);
    });
  });

  it("shows the message, re-enables the buttons and allows closing when the copy fails", async () => {
    routeFetch({
      [GET_BEA]: () => json(empty(BEA)),
      [PUT_BEA]: () => json({ detail: "boom" }, 500),
    });
    const { onClose, onCopied } = setup();
    fireEvent.click(confirmBox("Bea"));
    fireEvent.click(copyButton());
    expect(
      await screen.findByText(/Something went wrong on our side/),
    ).toBeInTheDocument();
    expect(onCopied).not.toHaveBeenCalled();
    expect(isOff(copyButton())).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks the whole dialog after a 401 and sends the browser to sign in", async () => {
    routeFetch({
      [GET_BEA]: () => json({ detail: "expired" }, 401),
      [PUT_BEA]: () => json({ detail: "expired" }, 401),
    });
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      assign,
      pathname: "/dashboard/availability",
      search: "",
    });
    const { onClose, onCopied } = setup();
    fireEvent.click(confirmBox("Bea"));
    fireEvent.click(copyButton());

    expect(
      await screen.findByText("Please sign in again."),
    ).toBeInTheDocument();
    expect(assign).toHaveBeenCalledWith(
      expect.stringContaining("/login?next="),
    );
    expect(isOff(copyButton())).toBe(true);
    expect(isOff(screen.getByRole("button", { name: "Cancel" }))).toBe(true);
    expect(screen.getByLabelText("Copy to")).toBeDisabled();
    expect(confirmBox("Bea")).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(onCopied).not.toHaveBeenCalled();
  });
});
