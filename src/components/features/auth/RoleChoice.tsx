import { cn } from "@/lib/utils";

type Role = "client" | "owner";

const OPTIONS: { value: Role; title: string; text: string }[] = [
  {
    value: "client",
    title: "I want to book",
    text: "Find a salon and book your appointment.",
  },
  {
    value: "owner",
    title: "I own a salon",
    text: "Set up your salon and take bookings.",
  },
];

type RoleChoiceProps = {
  value: Role | "";
  onChange: (role: Role) => void;
  error?: string;
};

export function RoleChoice({ value, onChange, error }: RoleChoiceProps) {
  const errorId = "role-error";
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="mb-1.5 text-sm font-medium">I am joining as</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-11 cursor-pointer flex-col gap-1 rounded-2xl border bg-card p-4 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
                checked ? "border-primary bg-secondary" : "border-input",
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="flex items-center gap-2 font-semibold">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    checked ? "border-primary" : "border-input",
                  )}
                >
                  {checked ? (
                    <span className="size-2.5 rounded-full bg-primary" />
                  ) : null}
                </span>
                {option.title}
              </span>
              <span className="text-sm text-muted-foreground">
                {option.text}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-sm font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
