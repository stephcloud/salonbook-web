import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OwnersOnlyNotice } from "@/components/features/auth/OwnersOnlyNotice";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import { DashboardNav } from "@/components/features/dashboard/DashboardNav";
import { buttonVariants } from "@/components/ui/button";
import { ApiError, type OwnerSalon } from "@/lib/api";
import { getMySalons, loginRedirectUrl, requireUser } from "@/lib/api-server";

type OwnerSalonPageProps = {
  /** This page's path, so signing in returns here. */
  path: string;
  title: string;
  description: string;
  /** Renders the page body for the owner's salon; it may read data first. */
  children: (salon: OwnerSalon) => ReactNode | Promise<ReactNode>;
};

const MAIN_CLASS =
  "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-8";

/**
 * The shared frame of the owner pages under /dashboard: signed-out goes to
 * /login, a client sees the owners-only notice (and no owner data is read for
 * them), an owner with no salon is sent to create one, and otherwise the
 * page body is rendered for their first salon.
 */
export async function OwnerSalonPage({
  path,
  title,
  description,
  children,
}: OwnerSalonPageProps) {
  const user = await requireUser(path);

  if (user.role !== "owner") {
    return (
      <main id="main-content" className={MAIN_CLASS}>
        <OwnersOnlyNotice />
      </main>
    );
  }

  let salons: OwnerSalon[];
  try {
    salons = await getMySalons();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(loginRedirectUrl(path));
    }
    if (error instanceof ApiError && error.status === 403) {
      return (
        <main id="main-content" className={MAIN_CLASS}>
          <OwnersOnlyNotice />
        </main>
      );
    }
    throw error;
  }

  const [salon] = salons;
  const back = (
    <div>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Back to dashboard
      </Link>
    </div>
  );

  if (!salon) {
    return (
      <main id="main-content" className={MAIN_CLASS}>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">
          Create your salon first, then come back to this page.
        </p>
        {back}
      </main>
    );
  }

  const body = await children(salon);

  return (
    <main id="main-content" className={MAIN_CLASS}>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      <DashboardNav />
      <QueryProvider>{body}</QueryProvider>
      {back}
    </main>
  );
}
