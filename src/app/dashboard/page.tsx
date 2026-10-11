import { LogoutButton } from "@/components/features/auth/LogoutButton";
import { OwnersOnlyNotice } from "@/components/features/auth/OwnersOnlyNotice";
import { requireUser } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "Dashboard · SalonBook" };

// PLACEHOLDER: the owner setup checklist replaces this.
export default async function DashboardPage() {
  const user = await requireUser("/dashboard");

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10"
    >
      {user.role === "owner" ? (
        <>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {user.name}. Your salon setup is coming soon.
          </p>
          <div>
            <LogoutButton />
          </div>
        </>
      ) : (
        <OwnersOnlyNotice />
      )}
    </main>
  );
}
