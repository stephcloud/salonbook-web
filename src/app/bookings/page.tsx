import { redirect } from "next/navigation";
import { BookingList } from "@/components/features/payment/BookingList";
import { ClientsOnlyNotice } from "@/components/features/booking/ClientsOnlyNotice";
import { ApiError } from "@/lib/api";
import { getMyBookings, loginRedirectUrl, requireUser } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata = { title: "My bookings · SalonBook" };

const MAIN_CLASS =
  "mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8";

export default async function BookingsPage() {
  const user = await requireUser("/bookings");

  if (user.role === "owner") {
    return (
      <main id="main-content" className={MAIN_CLASS}>
        <ClientsOnlyNotice />
      </main>
    );
  }

  let data: Awaited<ReturnType<typeof getMyBookings>>;
  try {
    data = await getMyBookings();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(loginRedirectUrl("/bookings"));
    }
    throw error;
  }

  return (
    <main id="main-content" className={MAIN_CLASS}>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">My bookings</h1>
        <p className="text-muted-foreground">Your appointments.</p>
      </header>
      <BookingList bookings={data.bookings} now={data.serverNow} />
    </main>
  );
}
