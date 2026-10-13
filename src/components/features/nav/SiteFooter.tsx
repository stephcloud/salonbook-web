import Link from "next/link";
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/auth/cookie";

const PUBLIC_LINKS = [
  { href: "/salons", label: "Find a salon" },
  { href: "/#faq", label: "FAQ" },
];
const GUEST_LINKS = [
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Register" },
];
/** `/register` sends signed-in people away, so only guests get those links. */
export async function SiteFooter() {
  const signedIn = Boolean((await cookies()).get(TOKEN_COOKIE));
  const links = signedIn ? PUBLIC_LINKS : [...PUBLIC_LINKS, ...GUEST_LINKS];

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold text-primary-dark">SalonBook</p>
          <p className="text-sm text-muted-foreground">
            Book your salon appointment and pay the deposit online.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-1">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
