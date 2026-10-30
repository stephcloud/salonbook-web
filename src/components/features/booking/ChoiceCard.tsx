import type { ReactNode } from "react";

type ChoiceCardProps = {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  children: ReactNode;
};

/** A radio option shown as a card. The whole card is the label, so it is easy to tap. */
export function ChoiceCard({
  name,
  value,
  checked,
  onSelect,
  children,
}: ChoiceCardProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border has-[:checked]:bg-secondary has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="mt-1 size-5 shrink-0 accent-primary"
      />
      <span className="flex min-w-0 flex-1 items-center gap-3">{children}</span>
    </label>
  );
}
