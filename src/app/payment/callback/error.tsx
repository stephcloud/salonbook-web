"use client";

import { LoadError } from "@/components/features/salons/LoadError";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <LoadError
      title="We could not check your payment just now"
      description="If you just paid, your payment is safe. We could not check it right now. Try again, or open My bookings in a minute."
      secondary={{ href: "/bookings", label: "My bookings" }}
      reset={reset}
    />
  );
}
