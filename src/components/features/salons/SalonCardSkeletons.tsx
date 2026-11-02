const PULSE = "animate-pulse motion-reduce:animate-none";

/** Placeholder salon cards in the SalonList grid: one on phones, two from sm, three from lg. */
export function SalonCardSkeletons() {
  return (
    <div
      aria-hidden="true"
      data-testid="salon-card-skeletons"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {["", "hidden sm:flex", "hidden lg:flex"].map((visibility, i) => (
        <div
          key={i}
          className={`${PULSE} relative flex aspect-[5/6] flex-col justify-between rounded-3xl bg-secondary p-4 ${visibility}`}
        >
          <div className="h-8 w-32 rounded-full bg-card" />
          <div className="flex items-end gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-5 w-3/4 rounded-full bg-card" />
              <div className="h-4 w-1/2 rounded-full bg-card" />
            </div>
            <div className="h-9 w-20 rounded-full bg-card" />
          </div>
        </div>
      ))}
    </div>
  );
}
