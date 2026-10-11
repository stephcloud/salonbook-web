import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const getSlots = vi.fn();
const createBooking = vi.fn();
vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getSlots: (...args: unknown[]) => getSlots(...args),
  createBooking: (...args: unknown[]) => createBooking(...args),
}));

import { ApiError, type Salon, type Service, type Stylist } from "@/lib/api";
import { BookingWizard } from "./BookingWizard";
import { QueryProvider } from "./QueryProvider";

const SALON_ID = "11111111-1111-4111-8111-111111111111";
const BRAIDS = "22222222-2222-4222-8222-222222222222";
const CONSULT = "33333333-3333-4333-8333-333333333333";
const AMARA = "44444444-4444-4444-8444-444444444444";
const JOY = "55555555-5555-4555-8555-555555555555";
const CHI = "66666666-6666-4666-8666-666666666666";
const SLOT_9 = "2026-10-12T09:00:00+01:00";
const SLOT_930 = "2026-10-12T09:30:00+01:00";

const salon: Salon = {
  id: SALON_ID,
  owner_id: "owner",
  name: "Pink Studio",
  address: "12 Admiralty Way, Lekki",
  phone: "08012345678",
  image_url: null,
  cancellation_hours: 24,
  deposit_amount: 500000,
  created_at: "2026-10-01T10:00:00Z",
};

const services: Service[] = [
  {
    id: BRAIDS,
    salon_id: SALON_ID,
    name: "Box braids",
    duration_minutes: 90,
    price_type: "fixed",
    price: 1500000,
    created_at: "2026-10-01T10:00:00Z",
  },
  {
    id: CONSULT,
    salon_id: SALON_ID,
    name: "Custom colour",
    duration_minutes: 120,
    price_type: "quote",
    price: null,
    created_at: "2026-10-01T10:00:00Z",
  },
];

const stylists: Stylist[] = [
  { id: AMARA, name: "Amara", image_url: null, service_ids: [BRAIDS] },
  { id: JOY, name: "Joy", image_url: null, service_ids: [CONSULT] },
];

const chi: Stylist = {
  id: CHI,
  name: "Chi",
  image_url: null,
  service_ids: [BRAIDS],
};

function renderWizard(
  initialServiceId: string | null = null,
  extraStylists: Stylist[] = [],
) {
  return render(
    <QueryProvider>
      <BookingWizard
        salon={salon}
        services={services}
        stylists={[...stylists, ...extraStylists]}
        initialServiceId={initialServiceId}
      />
    </QueryProvider>,
  );
}

function slotsResponse(slots: string[]) {
  return { stylist_id: AMARA, service_id: BRAIDS, slots };
}

type User = ReturnType<typeof userEvent.setup>;

async function toSlotStep(user: User) {
  await user.click(screen.getByRole("radio", { name: /Amara/ }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("button", { name: "9:00 AM" });
}

/** Pre-selected braids -> Amara -> the 9:00 AM slot -> review. */
async function walkToReview(user: User) {
  await toSlotStep(user);
  await user.click(screen.getByRole("button", { name: "9:00 AM" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { name: "Review your booking" });
}

describe("BookingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSlots.mockReset();
    getSlots.mockResolvedValue(slotsResponse([SLOT_9, SLOT_930]));
  });

  describe("service step", () => {
    it("lists services with duration, price or consultation label, and the deposit", () => {
      renderWizard();
      expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
      expect(screen.getByText("Box braids")).toBeInTheDocument();
      expect(screen.getByText("1 hr 30 min")).toBeInTheDocument();
      expect(screen.getByText("₦15,000")).toBeInTheDocument();
      expect(screen.getByText("Price on consultation")).toBeInTheDocument();
      expect(screen.getAllByText("Deposit: ₦5,000")).toHaveLength(2);
    });

    it("keeps Continue disabled and explains why until a service is chosen", () => {
      renderWizard();
      const next = screen.getByRole("button", { name: "Continue" });
      expect(next).toBeDisabled();
      expect(next).toHaveAccessibleDescription("Choose a service to continue.");
    });

    it("skips to the stylist step when a valid service is pre-selected", () => {
      renderWizard(BRAIDS);
      expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
      expect(
        screen.getByRole("group", { name: "Choose a stylist" }),
      ).toBeInTheDocument();
    });

    it("moves focus to the next step's heading", async () => {
      const user = userEvent.setup();
      renderWizard();
      await user.click(screen.getByRole("radio", { name: /Box braids/ }));
      await user.click(screen.getByRole("button", { name: "Continue" }));
      expect(
        await screen.findByRole("heading", { name: "Choose a stylist" }),
      ).toHaveFocus();
    });
  });

  describe("stylist step", () => {
    it("shows only stylists who offer the chosen service, with an initial avatar", () => {
      renderWizard(BRAIDS);
      expect(screen.getByRole("radio", { name: /Amara/ })).toBeInTheDocument();
      expect(screen.queryByRole("radio", { name: /Joy/ })).toBeNull();
      expect(screen.getByTestId("stylist-initial")).toHaveTextContent("A");
    });

    it("offers a way back when nobody offers the service", async () => {
      const user = userEvent.setup();
      render(
        <QueryProvider>
          <BookingWizard
            salon={salon}
            services={services}
            stylists={[]}
            initialServiceId={BRAIDS}
          />
        </QueryProvider>,
      );
      expect(
        screen.getByText("No stylists offer this service yet"),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Change service" }));
      expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    });
  });

  describe("slot step", () => {
    it("shows the slot times formatted in Lagos time and asks the API for the chosen day", async () => {
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await toSlotStep(user);

      expect(
        screen.getByRole("button", { name: "9:30 AM" }),
      ).toBeInTheDocument();
      expect(getSlots).toHaveBeenCalledWith(
        AMARA,
        BRAIDS,
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      );
      const next = screen.getByRole("button", { name: "Continue" });
      expect(next).toBeDisabled();
      expect(next).toHaveAccessibleDescription("Choose a time to continue.");
    });

    it("announces the outcome in one small status line", async () => {
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await toSlotStep(user);
      expect(screen.getByRole("status")).toHaveTextContent(
        "2 free times found.",
      );
    });

    it("says so when there are no free times", async () => {
      getSlots.mockResolvedValue(slotsResponse([]));
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await user.click(screen.getByRole("radio", { name: /Amara/ }));
      await user.click(screen.getByRole("button", { name: "Continue" }));
      expect(
        await screen.findByText("No free times on this day. Try another date."),
      ).toBeInTheDocument();
    });

    it("shows an error with a Retry that loads the times", async () => {
      getSlots.mockRejectedValueOnce(new ApiError(500, "Boom"));
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await user.click(screen.getByRole("radio", { name: /Amara/ }));
      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(await screen.findByText("Boom")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Retry" }));
      expect(
        await screen.findByRole("button", { name: "9:00 AM" }),
      ).toBeInTheDocument();
    });

    it("rejects a date in the past without calling the API and marks the field invalid", async () => {
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await toSlotStep(user);
      getSlots.mockClear();

      fireEvent.change(screen.getByLabelText("Date"), {
        target: { value: "2020-01-01" },
      });

      expect(
        await screen.findByText("Pick today or a later day."),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Date")).toBeInvalid();
      expect(screen.getByLabelText("Date")).toHaveAccessibleDescription(
        "Pick today or a later day.",
      );
      expect(getSlots).not.toHaveBeenCalled();
    });
  });

  describe("choices reset when something before them changes", () => {
    it("clears the chosen time when the date changes", async () => {
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await toSlotStep(user);
      await user.click(screen.getByRole("button", { name: "9:00 AM" }));
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();

      fireEvent.change(screen.getByLabelText("Date"), {
        target: { value: "2099-01-01" },
      });

      await waitFor(() =>
        expect(getSlots).toHaveBeenLastCalledWith(AMARA, BRAIDS, "2099-01-01"),
      );
      expect(
        await screen.findByRole("button", { name: "9:00 AM" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    });

    it("clears the chosen time when another stylist is picked", async () => {
      const user = userEvent.setup();
      renderWizard(BRAIDS, [chi]);
      await toSlotStep(user);
      await user.click(screen.getByRole("button", { name: "9:00 AM" }));

      await user.click(screen.getByRole("button", { name: "Back" }));
      await user.click(screen.getByRole("radio", { name: /Chi/ }));
      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(
        await screen.findByRole("button", { name: "9:00 AM" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    });

    it("clears the stylist when another service is picked", async () => {
      const user = userEvent.setup();
      renderWizard();
      await user.click(screen.getByRole("radio", { name: /Box braids/ }));
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await user.click(screen.getByRole("radio", { name: /Amara/ }));
      await user.click(screen.getByRole("button", { name: "Back" }));
      await user.click(screen.getByRole("radio", { name: /Custom colour/ }));
      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.getByRole("radio", { name: /Joy/ })).not.toBeChecked();
      expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    });

    it("keeps the stylist when the same service is chosen again", async () => {
      const user = userEvent.setup();
      renderWizard();
      await user.click(screen.getByRole("radio", { name: /Box braids/ }));
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await user.click(screen.getByRole("radio", { name: /Amara/ }));
      await user.click(screen.getByRole("button", { name: "Back" }));
      await user.click(screen.getByRole("radio", { name: /Box braids/ }));
      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.getByRole("radio", { name: /Amara/ })).toBeChecked();
    });

    it("lets the client go Back from review and choose a different time", async () => {
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);

      await user.click(screen.getByRole("button", { name: "Back" }));
      expect(
        await screen.findByRole("button", { name: "9:00 AM" }),
      ).toHaveAttribute("aria-pressed", "true");
      await user.click(screen.getByRole("button", { name: "9:30 AM" }));
      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(
        await screen.findByText("Mon, 12 Oct 2026, 9:30 AM"),
      ).toBeInTheDocument();
    });
  });

  describe("review and create", () => {
    it("summarises the booking with price, deposit and the refund rule", async () => {
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);

      expect(screen.getByText("Pink Studio")).toBeInTheDocument();
      expect(screen.getByText("Box braids")).toBeInTheDocument();
      expect(screen.getByText("Amara")).toBeInTheDocument();
      expect(screen.getByText("Mon, 12 Oct 2026, 9:00 AM")).toBeInTheDocument();
      expect(screen.getByText("₦15,000")).toBeInTheDocument();
      expect(screen.getByText("₦5,000")).toBeInTheDocument();
      expect(
        screen.getByText(/Refund only if you cancel more than 24 hours before/),
      ).toBeInTheDocument();
    });

    it("shows 'Price on consultation' for a quote service", async () => {
      getSlots.mockResolvedValue({
        stylist_id: JOY,
        service_id: CONSULT,
        slots: [SLOT_9],
      });
      const user = userEvent.setup();
      renderWizard(CONSULT);
      await user.click(screen.getByRole("radio", { name: /Joy/ }));
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await user.click(await screen.findByRole("button", { name: "9:00 AM" }));
      await user.click(screen.getByRole("button", { name: "Continue" }));
      expect(
        await screen.findByText("Price on consultation"),
      ).toBeInTheDocument();
    });

    it("sends the slot exactly as given and goes to the pay page", async () => {
      createBooking.mockResolvedValue({ id: "booking-1" });
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));

      await waitFor(() =>
        expect(push).toHaveBeenCalledWith("/bookings/booking-1/pay"),
      );
      expect(createBooking).toHaveBeenCalledTimes(1);
      expect(createBooking).toHaveBeenCalledWith({
        stylist_id: AMARA,
        service_id: BRAIDS,
        starts_at: SLOT_9,
      });
      expect(screen.getByRole("status")).toHaveTextContent(
        "Taking you to payment...",
      );
    });

    it("sends one request when the button is clicked twice before React re-renders", async () => {
      createBooking.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);

      const confirm = screen.getByRole("button", { name: "Confirm booking" });
      // Two clicks in the same tick: the button is not disabled yet, so only
      // the ref guard in the handler can stop the second one.
      act(() => {
        fireEvent.click(confirm);
        fireEvent.click(confirm);
      });

      // TanStack runs the request a tick later; wait for it, then give a
      // second call the chance to show up.
      await waitFor(() => expect(createBooking).toHaveBeenCalledTimes(1));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(createBooking).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByRole("button", { name: "Creating booking..." }),
      ).toBeDisabled();
    });
  });

  describe("create errors", () => {
    it("goes back to the slot step with a message and the refreshed list on a 409", async () => {
      getSlots
        .mockResolvedValueOnce(slotsResponse([SLOT_9, SLOT_930]))
        .mockResolvedValue(slotsResponse([SLOT_930]));
      createBooking.mockRejectedValue(
        new ApiError(
          409,
          "That time slot is no longer available. Please pick another time.",
        ),
      );
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));

      expect(
        await screen.findByText(
          "That time was just taken. Please pick another time.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
      // The taken time is gone from the list and nothing is selected.
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "9:00 AM" })).toBeNull(),
      );
      expect(screen.getByRole("button", { name: "9:30 AM" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    });

    it("clears the taken-slot message once a new time is picked", async () => {
      createBooking.mockRejectedValue(
        new ApiError(409, "That time slot is no longer available."),
      );
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));
      await screen.findByText(/just taken/);

      await user.click(await screen.findByRole("button", { name: "9:30 AM" }));
      expect(screen.queryByText(/just taken/)).toBeNull();
    });

    it("explains the 3-pending limit and links to /bookings", async () => {
      createBooking.mockRejectedValue(
        new ApiError(
          409,
          "You already have 3 unpaid pending bookings. Complete one or wait 15 minutes for it to expire.",
        ),
      );
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));

      expect(
        await screen.findByText(/You already have 3 unpaid pending bookings/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Pay or cancel one of your pending bookings/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "View my bookings" }),
      ).toHaveAttribute("href", "/bookings");
      // Still on the review step, and the button works again.
      expect(
        screen.getByRole("button", { name: "Confirm booking" }),
      ).toBeEnabled();
    });

    it("shows the server's field errors on a 422", async () => {
      createBooking.mockRejectedValue(
        new ApiError(422, "Invalid", {
          starts_at: "Input should have timezone info",
        }),
      );
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));

      expect(
        await screen.findByText("Time: Input should have timezone info"),
      ).toBeInTheDocument();
    });

    it("does not show a raw field name it cannot label", async () => {
      createBooking.mockRejectedValue(
        new ApiError(422, "Invalid", { body: "Field required" }),
      );
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));

      expect(await screen.findByText("Field required")).toBeInTheDocument();
      expect(screen.queryByText(/body:/)).toBeNull();
    });

    it("shows a plain 422 message when there are no field errors", async () => {
      createBooking.mockRejectedValue(
        new ApiError(422, "starts_at must be in the future"),
      );
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));
      expect(
        await screen.findByText("starts_at must be in the future"),
      ).toBeInTheDocument();
    });

    it("shows the clients-only notice on a 403, without a second h1", async () => {
      createBooking.mockRejectedValue(new ApiError(403, "forbidden"));
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));

      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Booking is for clients",
        }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    });

    it("stays disabled and quiet on a 401 while the login redirect happens", async () => {
      createBooking.mockRejectedValue(
        new ApiError(401, "Please sign in again."),
      );
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));

      expect(await screen.findByRole("status")).toHaveTextContent(
        "Redirecting you to sign in...",
      );
      expect(
        screen.getByRole("button", { name: "Creating booking..." }),
      ).toBeDisabled();
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("hides raw server error text on a 5xx and lets the client try again", async () => {
      createBooking.mockRejectedValueOnce(
        new ApiError(500, "Traceback (most recent call last)"),
      );
      createBooking.mockResolvedValueOnce({ id: "booking-2" });
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));

      expect(
        await screen.findByText(
          "We could not create your booking. Please try again.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Traceback/)).toBeNull();

      await user.click(screen.getByRole("button", { name: "Confirm booking" }));
      await waitFor(() =>
        expect(push).toHaveBeenCalledWith("/bookings/booking-2/pay"),
      );
      expect(createBooking).toHaveBeenCalledTimes(2);
    });

    it("lets the client try again after a network failure", async () => {
      createBooking.mockRejectedValueOnce(new TypeError("fetch failed"));
      createBooking.mockResolvedValueOnce({ id: "booking-3" });
      const user = userEvent.setup();
      renderWizard(BRAIDS);
      await walkToReview(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));
      expect(
        await screen.findByText(/Could not reach the server/),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Confirm booking" }));
      await waitFor(() =>
        expect(push).toHaveBeenCalledWith("/bookings/booking-3/pay"),
      );
    });
  });
});
