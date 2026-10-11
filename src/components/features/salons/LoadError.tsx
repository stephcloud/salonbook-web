"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

type LoadErrorProps = {
  title: string;
  reset: () => void;
};

export function LoadError({ title, reset }: LoadErrorProps) {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-4 py-12"
    >
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-muted-foreground">
        The server may be waking up or your connection dropped. Please try
        again.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Retry</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
