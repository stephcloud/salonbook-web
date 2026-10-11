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
    <h2 id={id} tabIndex={-1} className="text-xl font-bold outline-none">
      {children}
    </h2>
  );
}
