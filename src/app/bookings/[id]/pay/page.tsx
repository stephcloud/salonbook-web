import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/api-server";
import { safeNextPath } from "@/lib/auth/safe-next";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "Pay deposit · SalonBook" };

// PLACEHOLDER: the payment step (countdown and Pay button) replaces this.
export default async function PayBookingPage({
  params,
}: PageProps<"/bookings/[id]/pay">) {
  const { id } = await params;
  await requireUser(
    safeNextPath(`/bookings/${encodeURIComponent(id)}/pay`) ?? "/salons",
  );

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-4 py-12"
    >
      <h1 className="text-2xl font-bold">Booking created</h1>
      <p role="status" className="font-semibold">
        Payment is not available yet. Your deposit has not been paid, and an
        unpaid booking is released after 15 minutes.
      </p>
      <p className="text-sm break-all">Booking id: {id}</p>
      <Link href="/salons" className={buttonVariants({ variant: "outline" })}>
        Back to salons
      </Link>
    </main>
  );
}
