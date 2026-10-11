function Bar({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-full bg-secondary ${className}`}
    />
  );
}

/** Loading screen: the waking-up message plus a few placeholder cards. */
export function LoadingShell() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8"
    >
      <div role="status" className="flex flex-col gap-1">
        <p className="font-semibold">Waking up the server...</p>
        <p className="text-sm text-muted-foreground">
          The first visit after a quiet spell can take up to a minute.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            aria-hidden="true"
            className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <div className="aspect-[16/10] animate-pulse rounded-xl bg-secondary" />
            <Bar className="h-5 w-2/3" />
            <Bar className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  );
}
