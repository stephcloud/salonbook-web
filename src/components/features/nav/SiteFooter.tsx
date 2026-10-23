import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowUpRight } from "lucide-react";
import {
  ROLE_COOKIE,
  TOKEN_COOKIE,
  parseRole,
  type DisplayRole,
} from "@/lib/auth/cookie";
import { Wordmark } from "@/components/features/nav/Wordmark";
import { HOME_ANCHORS } from "@/lib/landing-content";

type FooterLink = { href: string; label: string };
type FooterColumn = { title: string; links: FooterLink[] };

/**
 * Social profiles. Put the real profile URL in `href` when an account exists;
 * an entry without a real `https://` URL (like the "#" placeholders) is not
 * shown, and the whole column is hidden while none has one.
 */
export const SOCIAL_LINKS: FooterLink[] = [
  { href: "#", label: "Facebook" },
  { href: "#", label: "LinkedIn" },
  { href: "#", label: "Instagram" },
];

const PRICING = "/#pricing";

const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium outline-none hover:bg-card hover:text-primary-dark focus-visible:ring-3 focus-visible:ring-ring";

/**
 * The footer columns for this visitor. Only guests get Sign in and Register
 * (`/register` sends signed-in people away). Signed-in people get the same role
 * links as the header, from the display-only `sb_role` cookie; without a valid
 * role they count as a client, as in the header. Landing links come from
 * `HOME_ANCHORS`, so the footer and the header cannot drift apart.
 */
function footerColumns(
  signedIn: boolean,
  role: DisplayRole | null,
): FooterColumn[] {
  const owner = signedIn && role === "owner";
  const client = signedIn && !owner;

  return [
    {
      title: "For clients",
      links: [
        { href: "/salons", label: "Find a salon" },
        ...(client ? [{ href: "/bookings", label: "My bookings" }] : []),
        ...(signedIn
          ? []
          : [
              { href: "/login", label: "Sign in" },
              { href: "/register", label: "Register" },
            ]),
      ],
    },
    {
      title: "For salon owners",
      links: [
        ...(owner
          ? [
              { href: "/dashboard", label: "Dashboard" },
              { href: "/dashboard/availability", label: "Weekly hours" },
              { href: "/dashboard/bookings", label: "Bookings" },
            ]
          : []),
        ...HOME_ANCHORS.filter(({ href }) => href === PRICING),
      ],
    },
    {
      title: "Company",
      links: HOME_ANCHORS.filter(({ href }) => href !== PRICING),
    },
  ];
}

/**
 * True only for an absolute https URL with a real host name, so "#", "",
 * relative paths, `http:`, `javascript:`, `localhost`, IP addresses and URLs
 * with a user name or password are skipped.
 */
function isRealUrl(href: string): boolean {
  if (!/^https:\/\//i.test(href)) return false;
  try {
    const { hostname, username, password } = new URL(href);
    return (
      !username &&
      !password &&
      /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(hostname) &&
      !/^[\d.]+$/.test(hostname)
    );
  } catch {
    return false;
  }
}

/** The site footer: brand block, link columns, and a bottom bar. */
export async function SiteFooter() {
  const store = await cookies();
  const signedIn = Boolean(store.get(TOKEN_COOKIE));
  const role = parseRole(store.get(ROLE_COOKIE)?.value);
  // A column with nothing to show (e.g. no pricing anchor for a guest) is left out.
  const columns = footerColumns(signedIn, role).filter(
    ({ links }) => links.length > 0,
  );
  const social = SOCIAL_LINKS.filter(({ href }) => isRealUrl(href));
  // Three columns sit in one row from `sm`; two or four make even pairs.
  const count = columns.length + (social.length > 0 ? 1 : 0);

  return (
    <footer className="border-t border-primary/15 bg-secondary">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col items-start gap-2">
          <Wordmark className="-ml-2" />
          <p className="max-w-xs text-sm text-muted-foreground">
            Book your salon appointment and pay the deposit online.
          </p>
        </div>
        <div
          className={`grid grid-cols-1 gap-6 ${count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} lg:grid-cols-none lg:auto-cols-fr lg:grid-flow-col`}
        >
          {columns.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2 className="font-sans text-sm font-semibold text-foreground">
                {title}
              </h2>
              <ul className="mt-2 -ml-3 flex flex-col">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={LINK_CLASS}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          {social.length > 0 && (
            <nav aria-label="Find us on social">
              <h2 className="font-sans text-sm font-semibold text-foreground">
                Find us on social
              </h2>
              <ul className="mt-2 -ml-3 flex flex-col">
                {social.map(({ href, label }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`SalonBook on ${label} (opens in a new tab)`}
                      className={`${LINK_CLASS} gap-1.5`}
                    >
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
      <div className="border-t border-primary/15">
        <p className="mx-auto w-full max-w-5xl px-4 py-4 text-sm text-muted-foreground">
          © 2026 SalonBook
        </p>
      </div>
    </footer>
  );
}
