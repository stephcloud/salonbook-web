import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import { PayPanel } from "@/components/features/payment/PayPanel";
import { buttonVariants } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { getMyBooking, loginRedirectUrl, requireUser } from "@/lib/api-server";
import { safeNextPath } from "@/lib/auth/safe-next";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Pay deposit · SalonBook",
  description:
    "Pay the deposit to confirm your salon booking before the hold runs out.",
  robots: { index: false, follow: false },
};

const MAIN_CLASS =
  "mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8";

export default async function PayBookingPage({
  params,
}: PageProps<"/bookings/[id]/pay">) {
  const { id } = await params;
  const next =
    safeNextPath(`/bookings/${encodeURIComponent(id)}/pay`) ?? "/salons";
  await requireUser(next);

  let data: Awaited<ReturnType<typeof getMyBooking>>;
  try {
    data = await getMyBooking(id);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect(loginRedirectUrl(next));
      // Someone else's booking, no such booking, or a malformed id.
      if ([403, 404, 422].includes(error.status)) {
        return (
          <main id="main-content" className={MAIN_CLASS}>
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-2xl font-bold">
                We could not find this booking
              </h1>
              <p role="status" className="text-muted-foreground">
                It may belong to another account, or the link may be wrong. Open
                My bookings to see yours.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/bookings"
                  className={buttonVariants({ size: "lg" })}
                >
                  My bookings
                </Link>
                <Link
                  href="/salons"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Browse salons
                </Link>
              </div>
            </div>
          </main>
        );
      }
    }
    throw error;
  }

  return (
    <main id="main-content" className={MAIN_CLASS}>
      <QueryProvider>
        <PayPanel initialBooking={data.booking} serverNow={data.serverNow} />
      </QueryProvider>
    </main>
  );
}
