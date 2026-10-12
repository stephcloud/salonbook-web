import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CopySalonLinkButton } from "@/components/features/salons/CopySalonLinkButton";

/** The salon's public link, a Copy link button and a way to see what customers see. */
export function ShareSalonLink({ salonId }: { salonId: string }) {
  const path = `/salons/${salonId}`;
  return (
    <div className="mt-3 flex flex-col gap-3">
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
