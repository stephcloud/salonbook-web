import Link from "next/link";
import { OwnersOnlyNotice } from "@/components/features/auth/OwnersOnlyNotice";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/api-server";

type OwnerPlaceholderProps = {
  /** This page's path, so signing in returns here. */
  path: string;
  title: string;
  description: string;
};

/** A page that comes in a later step: owner-only, with a way back to the dashboard. */
export async function OwnerPlaceholder({
  path,
  title,
  description,
}: OwnerPlaceholderProps) {
  const user = await requireUser(path);

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-8"
    >
      {user.role === "owner" ? (
        <>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          <p className="text-sm text-muted-foreground">
            This part comes next. For now, your setup list on the dashboard
            shows what is left to do.
          </p>
          <div>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Back to dashboard
            </Link>
          </div>
        </>
      ) : (
        <OwnersOnlyNotice />
      )}
    </main>
  );
}
