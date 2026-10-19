type SectionHeadingProps = {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: string;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
}: SectionHeadingProps) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      {eyebrow ? (
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      ) : null}
      <h2 id={id} className="text-2xl font-bold md:text-3xl">
        {title}
      </h2>
      {intro ? <p className="text-lg text-muted-foreground">{intro}</p> : null}
    </div>
  );
}
