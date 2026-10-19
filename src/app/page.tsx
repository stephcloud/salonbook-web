import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AudienceSection } from "@/components/features/landing/AudienceSection";
import { BenefitsSection } from "@/components/features/landing/BenefitsSection";
import { FAQSection } from "@/components/features/landing/FAQSection";
import { FeaturesSection } from "@/components/features/landing/FeaturesSection";
import { FinalCTASection } from "@/components/features/landing/FinalCTASection";
import { Hero } from "@/components/features/landing/Hero";
import { HowItWorks } from "@/components/features/landing/HowItWorks";
import type { Viewer } from "@/components/features/landing/LandingActions";
import { PricingNote } from "@/components/features/landing/PricingNote";
import { ProblemSection } from "@/components/features/landing/ProblemSection";
import { ProductPreview } from "@/components/features/landing/ProductPreview";
import { ROLE_COOKIE, TOKEN_COOKIE, parseRole } from "@/lib/auth/cookie";

const TITLE = "SalonBook · Book your salon appointment online";
const DESCRIPTION =
  "Pick a service and a stylist, see real free times and pay a deposit to keep your spot. Salon owners set up their own page and share one link.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
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
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-8 md:gap-20"
    >
      <Hero viewer={viewer} />
      <ProductPreview />
      <ProblemSection />
      <FeaturesSection />
      <AudienceSection />
      <HowItWorks />
      <BenefitsSection />
      <PricingNote />
      <FAQSection />
      <FinalCTASection viewer={viewer} />
    </main>
  );
}
