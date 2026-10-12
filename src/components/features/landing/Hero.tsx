import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export type Viewer = "guest" | "client" | "owner";

type HeroProps = { viewer: Viewer };

/**
 * `/register` sends signed-in people away, so the second button changes with
 * the viewer: owners get their dashboard, clients get no second button.
 */
export function Hero({ viewer }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="flex flex-col items-start gap-6 py-6 md:py-12"
    >
      <p className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
        Salon booking with deposits
      </p>
      <h1
        id="hero-heading"
        className="max-w-2xl text-3xl leading-tight font-bold md:text-5xl"
      >
        Book your salon appointment online and pay the deposit.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Pick a service and a stylist, see real free times, and keep your spot
        with a deposit. Salon owners set up their own page and share one link.
      </p>
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
    </section>
  );
}
