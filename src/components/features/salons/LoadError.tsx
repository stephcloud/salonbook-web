"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

type LoadErrorProps = {
  title: string;
  reset: () => void;
  /** Replaces the default "server may be waking up" sentence. */
  description?: string;
  /** Replaces the "Back to home" link. */
  secondary?: { href: string; label: string };
};

export function LoadError({
  title,
  reset,
  description = "The server may be waking up or your connection dropped. Please try again.",
  secondary = { href: "/", label: "Back to home" },
}: LoadErrorProps) {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-4 py-12"
    >
      <div role="alert" className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Retry</Button>
        <Link
          href={secondary.href}
          className={buttonVariants({ variant: "outline" })}
        >
          {secondary.label}
        </Link>
      </div>
    </main>
  );
}
