export const WIZARD_STEPS = [
  { id: "service", label: "Service" },
  { id: "stylist", label: "Stylist" },
  { id: "slot", label: "Date and time" },
  { id: "review", label: "Review" },
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number]["id"];

export function StepIndicator({ current }: { current: WizardStep }) {
  const index = WIZARD_STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Booking progress">
      <p className="text-sm font-semibold text-muted-foreground">
        Step {index + 1} of {WIZARD_STEPS.length}
      </p>
      <ol className="mt-2 flex flex-wrap gap-2">
        {WIZARD_STEPS.map((step, i) => (
          <li
            key={step.id}
            aria-current={step.id === current ? "step" : undefined}
            className={
              step.id === current
                ? "rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground"
                : i < index
                  ? "rounded-full bg-secondary px-3 py-1 text-sm font-medium ring-1 ring-primary/30"
                  : "rounded-full px-3 py-1 text-sm text-muted-foreground ring-1 ring-border"
            }
          >
            {step.label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
