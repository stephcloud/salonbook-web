"use client";

import { LoadError } from "@/components/features/salons/LoadError";

export default function Error({ reset }: { reset: () => void }) {
  return <LoadError title="We could not load this salon" reset={reset} />;
}
