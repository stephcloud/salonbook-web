import { WakingNote } from "@/components/features/loading/WakingNote";

export default function Loading() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12"
    >
      <div role="status" className="flex flex-col gap-2">
        <p className="font-semibold">Loading…</p>
        <WakingNote />
      </div>
    </main>
  );
}
