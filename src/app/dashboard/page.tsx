import { redirect } from "next/navigation";
import { OwnersOnlyNotice } from "@/components/features/auth/OwnersOnlyNotice";
import { DashboardNav } from "@/components/features/dashboard/DashboardNav";
import { EditSalonSection } from "@/components/features/dashboard/EditSalonSection";
import { SalonForm } from "@/components/features/dashboard/SalonForm";
import { SalonOverview } from "@/components/features/dashboard/SalonOverview";
import { SetupChecklist } from "@/components/features/dashboard/SetupChecklist";
import { ApiError } from "@/lib/api";
import { getMySalons, loginRedirectUrl, requireUser } from "@/lib/api-server";
import { loadChecklistInput } from "@/lib/dashboard-data";
import { buildChecklist } from "@/lib/setup-checklist";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "Dashboard · SalonBook" };

const MAIN_CLASS =
  "mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");

  // A client sees the notice and nothing about salons is read for them.
  if (user.role !== "owner") {
    return (
      <main id="main-content" className={MAIN_CLASS}>
        <OwnersOnlyNotice />
      </main>
    );
  }

  let salons: Awaited<ReturnType<typeof getMySalons>>;
  try {
    salons = await getMySalons();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(loginRedirectUrl("/dashboard"));
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

  if (!salon) {
    return (
      <main id="main-content" className={MAIN_CLASS}>
        <header className="flex max-w-2xl flex-col gap-1">
          <h1 className="text-2xl font-bold">Create your salon</h1>
          <p className="text-muted-foreground">
            Welcome, {user.name}. Tell us about your salon. You can add
            services, stylists and opening hours next.
          </p>
        </header>
        <div className="max-w-2xl rounded-2xl bg-card p-4 ring-1 ring-border md:p-6">
          <SalonForm mode="create" />
        </div>
      </main>
    );
  }

  const checklist = buildChecklist(await loadChecklistInput(salon));

  return (
    <main id="main-content" className={MAIN_CLASS}>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user.name}.</p>
        {salons.length > 1 ? (
          <p className="text-sm text-muted-foreground">
            You have {salons.length} salons. This page manages {salon.name}.
          </p>
        ) : null}
      </header>
      <DashboardNav />
      <div className="grid gap-6 md:grid-cols-[2fr_3fr] md:items-start">
        <div className="flex flex-col gap-4">
          <SalonOverview salon={salon} />
          <EditSalonSection salon={salon} />
        </div>
        <div className="order-first md:order-none">
          <SetupChecklist checklist={checklist} salonId={salon.id} />
        </div>
      </div>
    </main>
  );
}
