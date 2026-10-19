import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export type Viewer = "guest" | "client" | "owner";

/**
 * `/register` sends signed-in people away, so the second button changes with
 * the viewer: owners get their dashboard, clients get no second button.
 */
export function LandingActions({ viewer }: { viewer: Viewer }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/salons" className={buttonVariants({ size: "lg" })}>
        Find a salon
      </Link>
      {viewer === "guest" ? (
        <Link
          href="/register"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Register your salon
        </Link>
      ) : null}
      {viewer === "owner" ? (
        <Link
          href="/dashboard"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Go to your dashboard
        </Link>
      ) : null}
    </div>
  );
}
