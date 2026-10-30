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
      <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
          >
            <div className="aspect-[16/10] animate-pulse rounded-xl bg-secondary motion-reduce:animate-none" />
            <div className="h-5 w-2/3 animate-pulse rounded-full bg-secondary motion-reduce:animate-none" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-secondary motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
