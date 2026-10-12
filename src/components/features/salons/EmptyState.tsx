import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children?: ReactNode;
};

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <p className="font-semibold break-words">{title}</p>
      {children ? (
        <div className="text-sm text-muted-foreground">{children}</div>
      ) : null}
    </div>
  );
}
