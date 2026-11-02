import { SalonCardSkeletons } from "@/components/features/salons/SalonCardSkeletons";

/** Shown while the salons load; the waking-up note appears after a few seconds. */
export function SalonResultsFallback({ searching }: { searching: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div role="status" className="flex flex-col gap-1">
        <p className="font-semibold">
          {searching ? "Searching…" : "Loading salons…"}
        </p>
        <p className="invisible text-sm text-muted-foreground [animation:reveal-late_0s_6s_forwards]">
          Waking up the server. The first visit after a quiet spell can take up
          to a minute.
        </p>
      </div>
      <SalonCardSkeletons />
    </div>
  );
}
