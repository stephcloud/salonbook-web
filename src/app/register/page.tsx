import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/features/auth/AuthShell";
import { RegisterForm } from "@/components/features/auth/RegisterForm";
import { getCurrentUser } from "@/lib/api-server";
import { homeForRole } from "@/lib/auth/home";
import { safeNextPath } from "@/lib/auth/safe-next";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Create account · SalonBook",
  description:
    "Create a SalonBook account to book salon appointments, or register your own salon.",
};

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const params = await searchParams;
  const raw = params.next;
  const next = safeNextPath(typeof raw === "string" ? raw : null);

  const user = await getCurrentUser();
  if (user) redirect(next ?? homeForRole(user.role));

  return (
    <AuthShell
      title="Create your account"
      subtitle="Book appointments, or set up your own salon."
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
