import type { OwnerSalon, Service, Stylist } from "@/lib/api";
import type { StylistAvailability } from "@/lib/api-server";
import { SALON_STATUS } from "@/lib/salon-status";

export type StepId =
  "salon" | "service" | "stylist" | "hours" | "approval" | "share";

/**
 * done: finished (from real data). todo: still to do. blocked: cannot start
 * yet. unknown: we could not check. ready: the share step once 1 to 5 are done.
 * waiting and paused: the salon is pending or suspended, which only an admin
 * can change, so it is not shown as a task for the owner.
 */
export type StepStatus =
  "done" | "todo" | "blocked" | "unknown" | "ready" | "waiting" | "paused";

export type ChecklistStep = {
  id: StepId;
  title: string;
  /** One line that says what is true now, in plain words. */
  detail: string;
  status: StepStatus;
  /** Where the step is done (null for steps with nothing to open). */
  href: string | null;
  actionLabel: string | null;
};

export type Checklist = {
  steps: ChecklistStep[];
  /** How many of the five setup steps are done (the share step is not counted). */
  doneCount: number;
  totalCount: number;
  progressText: string;
  /** Salon, a service, a stylist and weekly hours are in place, and the salon is approved. */
  readyForCustomers: boolean;
};

export type ChecklistInput = {
  salon: OwnerSalon;
  services: Service[];
  stylists: Stylist[];
  availability: {
    /** The stylists' weekly rules that could be read. */
    read: StylistAvailability[];
    /** Stylists whose hours we could not read (failed or past the limit). */
    unchecked: number;
  };
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Works out the owner's setup steps from what is really stored. Nothing is guessed. */
export function buildChecklist(input: ChecklistInput): Checklist {
  const { salon, services, stylists, availability } = input;

  const hasService = services.length > 0;
  const hasStylist = stylists.length > 0;
  const hasHours = availability.read.some((entry) =>
    entry.rules.some((rule) => rule.kind === "working"),
  );

  const hours: Pick<ChecklistStep, "status" | "detail" | "actionLabel"> =
    !hasStylist
      ? {
          status: "blocked",
          detail: "Add a stylist first, then set their hours.",
          actionLabel: "Set weekly hours",
        }
      : hasHours
        ? {
            status: "done",
            detail: "Customers can see free times.",
            actionLabel: "Change hours",
          }
        : availability.unchecked > 0
          ? {
              status: "unknown",
              detail:
                "We could not check the hours. Open the page to see them.",
              actionLabel: "Check hours",
            }
          : {
              status: "todo",
              detail: "Set the days and times each stylist works.",
              actionLabel: "Set weekly hours",
            };

  const steps: ChecklistStep[] = [
    {
      id: "salon",
      title: "Salon details",
      detail: `${salon.name} is set up.`,
      status: "done",
      href: null,
      actionLabel: null,
    },
    {
      id: "service",
      title: "Add a service",
      detail: hasService
        ? `${plural(services.length, "service", "services")} added.`
        : "Add what you offer, with a price and how long it takes.",
      status: hasService ? "done" : "todo",
      href: "/dashboard/services",
      actionLabel: hasService ? "Manage services" : "Add a service",
    },
    {
      id: "stylist",
      title: "Add a stylist",
      detail: hasStylist
        ? `${plural(stylists.length, "stylist", "stylists")} added.`
        : "Add the people customers can book with.",
      status: hasStylist ? "done" : "todo",
      href: "/dashboard/stylists",
      actionLabel: hasStylist ? "Manage stylists" : "Add a stylist",
    },
    {
      id: "hours",
      title: "Set weekly hours",
      ...hours,
      href: "/dashboard/availability",
    },
    {
      id: "approval",
      title: "Salon approval",
      detail: SALON_STATUS[salon.status].message,
      status:
        salon.status === "approved"
          ? "done"
          : salon.status === "suspended"
            ? "paused"
            : "waiting",
      href: null,
      actionLabel: null,
    },
  ];

  const setupSteps = steps.length;
  const doneCount = steps.filter((step) => step.status === "done").length;
  const readyForCustomers = doneCount === setupSteps;
  const setupDone = steps.every(
    (step) => step.id === "approval" || step.status === "done",
  );

  steps.push({
    id: "share",
    title: "Share your link",
    detail: readyForCustomers
      ? "Send this link to your customers so they can book."
      : !setupDone
        ? "Customers cannot book yet. Finish the steps above first."
        : salon.status === "suspended"
          ? "Customers cannot book while your salon is suspended."
          : "Customers cannot book until your salon is approved.",
    status: readyForCustomers ? "ready" : "blocked",
    href: null,
    actionLabel: null,
  });

  return {
    steps,
    doneCount,
    totalCount: setupSteps,
    progressText: `${doneCount} of ${setupSteps} set up`,
    readyForCustomers,
  };
}
