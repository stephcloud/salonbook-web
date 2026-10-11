import type { ReactNode } from "react";

/**
 * One label and value pair inside a `<dl className="grid ... sm:grid-cols-[auto_1fr]">`.
 * On a phone the label sits above its value; from `sm` up they share a row.
 */
export function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:contents">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export const SUMMARY_LIST_CLASS =
  "grid gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-[auto_1fr] sm:gap-x-6 sm:gap-y-3";
