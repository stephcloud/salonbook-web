import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Shown instead of the service checkboxes when the salon has no services yet. */
export function NoServicesNotice({
  mode = "add",
}: {
  /** "add": the stylist can still be added now. "assign": services must come first. */
  mode?: "add" | "assign";
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-secondary p-4">
      <p className="text-sm">
        {mode === "add"
          ? "This salon has no services yet. Add a service first so clients can book this stylist right away, or add the stylist now and assign services later."
          : "This salon has no services yet. Add a service first, then come back to choose what this stylist offers."}
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
