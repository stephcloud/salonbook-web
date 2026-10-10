"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-4 py-12">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
