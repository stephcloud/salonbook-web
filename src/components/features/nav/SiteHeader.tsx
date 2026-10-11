import Link from "next/link";
import { cookies } from "next/headers";
import { LogoutButton } from "@/components/features/auth/LogoutButton";
import { NavLink } from "@/components/features/nav/NavLink";
import { TOKEN_COOKIE } from "@/lib/auth/cookie";

/**
 * The site header. It only checks that the login cookie is there (no call to
 * the API, so no extra wait on any page), so it cannot tell clients from
 * owners: owners also get "My bookings" and are told it is for clients.
 *
 * Reading the cookie means every page is rendered per request, including the
 * landing page. Those pages already fetch from the API (so they were dynamic
 * anyway); the cost is accepted for a header that is right on first paint.
 *
 * On a phone the logo has its own row and the links sit below it, so a long
 * row of links never wraps in an uneven way.
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
          className="inline-flex min-h-11 basis-full items-center rounded-full px-1 text-lg font-bold text-primary-dark outline-none focus-visible:ring-3 focus-visible:ring-ring sm:mr-auto sm:basis-auto"
        >
          SalonBook
        </Link>
        <ul className="flex flex-wrap items-center gap-1">
          <li>
            <NavLink href="/salons">Salons</NavLink>
          </li>
          {signedIn ? (
            <>
              <li>
                <NavLink href="/bookings">My bookings</NavLink>
              </li>
              <li>
                <LogoutButton />
              </li>
            </>
          ) : (
            <>
              <li>
                <NavLink href="/login">Sign in</NavLink>
              </li>
              <li>
                <NavLink href="/register">Register</NavLink>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}
