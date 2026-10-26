import { CtaButton } from "@/components/features/landing/CtaButton";
import { cn } from "@/lib/utils";

export type Viewer = "guest" | "client" | "owner";

/**
 * `/register` sends signed-in people away, so the second button changes with
 * the viewer: owners get their dashboard, clients get no second button.
 * Full width and stacked on phones, side by side from `sm`. `className` lets
 * a narrow column (the final CTA from `md`) stack them again.
 */
export function LandingActions({
  viewer,
  className,
}: {
  viewer: Viewer;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4",
        className,
      )}
    >
      <CtaButton href="/salons" icon="search">
        Find a salon
      </CtaButton>
      {viewer === "guest" ? (
        <CtaButton href="/register" variant="outline" icon="arrow">
          Register your salon
        </CtaButton>
      ) : null}
      {viewer === "owner" ? (
        <CtaButton href="/dashboard" variant="outline" icon="arrow">
          Go to your dashboard
        </CtaButton>
      ) : null}
    </div>
  );
}
