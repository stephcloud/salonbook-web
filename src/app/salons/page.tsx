import { LogoutButton } from "@/components/features/auth/LogoutButton";
import { requireUser } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "Salons · SalonBook" };

// PLACEHOLDER: the salon list replaces this.
export default async function SalonsPage() {
  const user = await requireUser("/salons");

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10"
    >
      <h1 className="text-2xl font-bold">Salons</h1>
      <p className="text-muted-foreground">
        Signed in as {user.name}. The salon list is coming soon.
      </p>
      <div>
        <LogoutButton />
      </div>
    </main>
  );
}
