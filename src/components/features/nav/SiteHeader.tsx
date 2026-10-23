import { cookies } from "next/headers";
import { LogoutButton } from "@/components/features/auth/LogoutButton";
import { HomeAnchors } from "@/components/features/nav/HomeAnchors";
import { NavLink } from "@/components/features/nav/NavLink";
import { Wordmark } from "@/components/features/nav/Wordmark";
import { ROLE_COOKIE, TOKEN_COOKIE, parseRole } from "@/lib/auth/cookie";

/**
 * The site header. It reads two cookies and makes no call to the API (so no
 * extra wait on any page): the login cookie says whether someone is signed in,
 * and the display-only `sb_role` cookie says which link to show, Dashboard for
 * owners and My bookings for clients. The role cookie is not a permission: it
 * can be edited, so every protected page still checks the real role. A signed-in
 * session without a valid role cookie (made before it existed, or edited) gets
 * My bookings, which is what everyone saw before.
 *
 * Reading cookies means every page is rendered per request, including the
 * landing page. Those pages already fetch from the API (so they were dynamic
 * anyway); the cost is accepted for a header that is right on first paint.
 *
 * On a phone the logo has its own row and the links sit below it, so a long
 * row of links never wraps in an uneven way.
 *
 * From `lg` it is sticky: there it is one row (61px), and `scroll-padding-top`
 * on `html` (globals.css) keeps scrolled-to content below it. Below `lg` it is
 * two or three rows, too tall to keep on screen, so it scrolls away. If you
 * make it taller from `lg`, raise that padding too.
 */
export async function SiteHeader() {
  const store = await cookies();
  const signedIn = Boolean(store.get(TOKEN_COOKIE));
  const role = parseRole(store.get(ROLE_COOKIE)?.value);

  return (
    <header className="relative z-40 border-b border-border bg-card lg:sticky lg:top-0">
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2"
      >
        <Wordmark className="basis-full sm:mr-auto sm:basis-auto" />
        <HomeAnchors />
        <ul className="flex flex-wrap items-center gap-1">
          <li>
            <NavLink href="/salons">Salons</NavLink>
          </li>
          {signedIn ? (
            <>
              <li>
                {role === "owner" ? (
                  <NavLink href="/dashboard">Dashboard</NavLink>
                ) : (
                  <NavLink href="/bookings">My bookings</NavLink>
                )}
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
