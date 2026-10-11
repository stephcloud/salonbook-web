type PaymentLoadingProps = {
  title: string;
  description: string;
};

/** Loading screen for the narrow payment pages: a heading, a calm sentence and a few placeholder lines. */
export function PaymentLoading({ title, description }: PaymentLoadingProps) {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-12"
    >
      <h1 className="text-2xl font-bold">{title}</h1>
      <p role="status" className="text-muted-foreground">
        {description}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-secondary motion-reduce:animate-none" />
        <div className="h-5 w-1/2 animate-pulse rounded-full bg-secondary motion-reduce:animate-none" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-secondary motion-reduce:animate-none" />
      </div>
    </main>
  );
}
