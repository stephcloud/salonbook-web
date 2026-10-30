import type { ReactNode } from "react";
import { Wordmark } from "@/components/features/nav/Wordmark";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10"
    >
      {/* -ml-2 cancels the focus pill's padding so the letters line up with the card. */}
      <Wordmark className="-ml-2 self-start" />
      <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
