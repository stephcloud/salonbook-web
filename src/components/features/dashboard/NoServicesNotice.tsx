import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Shown instead of the service checkboxes when the salon has no services yet. */
export function NoServicesNotice() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-secondary p-4">
      <p className="text-sm">
        Add a service first. Services come before stylists, because each stylist
        needs at least one service before clients can book them.
      </p>
      <Link
        href="/dashboard/services"
        className={buttonVariants({ variant: "outline" })}
      >
        Go to services
      </Link>
    </div>
  );
}
