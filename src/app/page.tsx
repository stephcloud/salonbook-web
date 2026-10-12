import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AudienceSection } from "@/components/features/landing/AudienceSection";
import { Hero, type Viewer } from "@/components/features/landing/Hero";
import { HowItWorks } from "@/components/features/landing/HowItWorks";
import { PricingNote } from "@/components/features/landing/PricingNote";
import { ProblemSection } from "@/components/features/landing/ProblemSection";
import { ROLE_COOKIE, TOKEN_COOKIE, parseRole } from "@/lib/auth/cookie";

export const metadata: Metadata = {
  title: "SalonBook · Book your salon appointment online",
  description:
    "Pick a service and a stylist, see real free times and pay a deposit to keep your spot. Salon owners set up their own page and share one link.",
};

// The cookies are display-only (the same ones the header uses): no API call.
export default async function Home() {
  const store = await cookies();
  const signedIn = Boolean(store.get(TOKEN_COOKIE));
  const role = parseRole(store.get(ROLE_COOKIE)?.value);
  const viewer: Viewer = !signedIn
    ? "guest"
    : role === "owner"
      ? "owner"
      : "client";

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-8"
    >
      <Hero viewer={viewer} />
      <ProblemSection />
      <AudienceSection />
      <HowItWorks />
      <PricingNote />
    </main>
  );
}
