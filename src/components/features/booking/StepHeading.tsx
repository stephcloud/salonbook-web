import type { ReactNode } from "react";

/** Each step's title. The wizard moves focus here when the step changes. */
export function StepHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      tabIndex={-1}
      className="rounded text-xl font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </h2>
  );
}
