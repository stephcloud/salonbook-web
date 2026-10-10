export default function Loading() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-2 px-4 py-12"
    >
      <p role="status" className="font-semibold">
        Waking up the server...
      </p>
      <p className="text-muted-foreground">
        The first visit after a quiet spell can take up to a minute.
      </p>
    </main>
  );
}
