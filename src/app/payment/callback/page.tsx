import { PaymentCallback } from "@/components/features/payment/PaymentCallback";
import { QueryProvider } from "@/components/features/booking/QueryProvider";
import { requireUser } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "Confirming payment · SalonBook" };

// Paystack sends the client back here. This page deliberately does not read
// the URL (no searchParams): the booking comes from sessionStorage and the
// result from the API.
export default async function PaymentCallbackPage() {
  await requireUser("/payment/callback");

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-12"
    >
      <QueryProvider>
        <PaymentCallback />
      </QueryProvider>
    </main>
  );
}
