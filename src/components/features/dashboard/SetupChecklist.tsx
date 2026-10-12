import Link from "next/link";
import { Check, Circle, CircleAlert, Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ShareSalonLink } from "@/components/features/dashboard/ShareSalonLink";
import type { Checklist, StepStatus } from "@/lib/setup-checklist";

const STATUS: Record<StepStatus, { label: string; icon: typeof Check }> = {
  done: { label: "Done", icon: Check },
  todo: { label: "To do", icon: Circle },
  blocked: { label: "Not yet", icon: Lock },
  unknown: { label: "Could not check", icon: CircleAlert },
  ready: { label: "Ready to share", icon: Check },
};

/** The owner's setup steps. State is always written out, never shown by colour alone. */
export function SetupChecklist({
  checklist,
  salonId,
}: {
  checklist: Checklist;
  salonId: string;
}) {
  return (
    <section
      aria-labelledby="checklist-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="checklist-heading" className="text-xl font-bold">
          Set up your salon
        </h2>
        <p className="text-sm text-muted-foreground">
          {checklist.progressText}
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {checklist.steps.map((step, index) => {
          const { label, icon: Icon } = STATUS[step.status];
          const finished = step.status === "done" || step.status === "ready";
          return (
            <li
              key={step.id}
              className="flex gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
            >
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  finished
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-primary-dark"
                }`}
              >
                <Icon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="font-semibold">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{label}.</span>{" "}
                  {step.detail}
                </p>
                {step.href && step.actionLabel ? (
                  <div className="mt-2">
                    <Link
                      href={step.href}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      {step.actionLabel}
                    </Link>
                  </div>
                ) : null}
                {step.id === "share" ? (
                  <ShareSalonLink salonId={salonId} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
