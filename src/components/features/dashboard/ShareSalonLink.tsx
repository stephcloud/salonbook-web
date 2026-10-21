import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CopySalonLinkButton } from "@/components/features/salons/CopySalonLinkButton";
import type { SalonStatus } from "@/lib/api";

/**
 * The salon's public link, a Copy link button and a way to see what customers
 * see. The link and Copy stay while the salon is not approved, so the owner can
 * share it ahead of time; a note says why it shows "not found" until then.
 */
export function ShareSalonLink({
  salonId,
  status,
}: {
  salonId: string;
  status: SalonStatus;
}) {
  const path = `/salons/${salonId}`;
  return (
    <div className="mt-3 flex flex-col gap-3">
      {status !== "approved" ? (
        <p className="rounded-2xl bg-accent p-3 text-sm">
          Customers who open this link will see &ldquo;not found&rdquo;{" "}
          {status === "suspended"
            ? "while your salon is suspended."
            : "until your salon is approved."}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Your public link:{" "}
        <code className="rounded-md bg-secondary px-1.5 py-0.5 text-sm break-all text-foreground">
          {path}
        </code>
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <CopySalonLinkButton salonId={salonId} />
        <Link
          href={path}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Preview as a customer
        </Link>
      </div>
    </div>
  );
}
