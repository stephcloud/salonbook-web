import Link from "next/link";
import { cookies } from "next/headers";
import { LogoutButton } from "@/components/features/auth/LogoutButton";
import { NavLink } from "@/components/features/nav/NavLink";
import { TOKEN_COOKIE } from "@/lib/auth/cookie";

/**
 * The site header. It only checks that the login cookie is there (no call to
 * the API, so every page stays fast), so it cannot tell clients from owners:
 * owners also get "My bookings" and are told it is for clients.
 */
export async function SiteHeader() {
  const signedIn = (await cookies()).has(TOKEN_COOKIE);

  return (
    <header className="border-b border-border bg-card">
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2"
      >
        <Link
          href="/"
          className="mr-auto inline-flex min-h-11 items-center rounded-full px-1 text-lg font-bold text-primary-dark outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          SalonBook
        </Link>
        <NavLink href="/salons">Salons</NavLink>
        {signedIn ? (
          <>
            <NavLink href="/bookings">My bookings</NavLink>
            <LogoutButton />
          </>
        ) : (
          <>
            <NavLink href="/login">Sign in</NavLink>
            <NavLink href="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
