import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Buttons that stack full width on a phone and sit side by side from `sm`. */
export function ActionRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
      {children}
    </div>
  );
}

/** The class for a link or button inside an ActionRow. */
export function actionClass(variant: "default" | "outline" = "default") {
  return cn(buttonVariants({ variant, size: "lg" }), "w-full sm:w-auto");
}
