"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { LoadError } from "@/components/features/salons/LoadError";

export default function Error({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <LoadError
      title="We could not load your dashboard"
      // The failure came from a server fetch: refresh so Retry asks the server again.
      reset={() =>
        startTransition(() => {
          router.refresh();
          reset();
        })
      }
      secondary={{ href: "/salons", label: "Browse salons" }}
    />
  );
}
