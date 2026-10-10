import { redirect } from "next/navigation";
import { AuthShell } from "@/components/features/auth/AuthShell";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { getCurrentUser } from "@/lib/api-server";
import { homeForRole } from "@/lib/auth/home";
import { safeNextPath } from "@/lib/auth/safe-next";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "Sign in · SalonBook" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const raw = params.next;
  const next = safeNextPath(typeof raw === "string" ? raw : null);

  const user = await getCurrentUser();
  if (user) redirect(next ?? homeForRole(user.role));

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your bookings.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
