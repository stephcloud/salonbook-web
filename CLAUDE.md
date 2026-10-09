# Project Context

## Project
- Name: salonbook-web
- Purpose: Frontend for SalonBook, a platform many salons use. Clients pick a service and stylist, see real availability, pay a deposit, and manage bookings. Owners register themselves, set up their own salon, services, stylists and hours, and share their salon link with their customers.
- Backend repo: salonbook-api (FastAPI on Render)
- Deployed on: Vercel (auto-deploys from `main`, every pull request gets a preview URL)
- Two-week MVP: main journey works end to end on the deployed URL; landing page that pitches the startup (problem, who it's for, pricing placeholder). Log progress in `LOG.md` daily.

## Pages / routes
- `/` landing page (problem, who it's for, how it works, light pricing placeholder, CTA)
- `/login`, `/register` (register has a choice: client or salon owner)
- `/salons` list, `/salons/[id]` salon detail with services and stylists
- `/book/[salonId]` wizard: service, stylist, date and slot, review, then pay deposit (service can be passed as `?service=`)
- `/bookings/[id]/pay` pending booking with 15 minute countdown and Pay button
- `/payment/callback` the one fixed page Paystack returns to
- `/bookings` client's bookings (cancel only, shows refund outcome)
- `/dashboard` owner: setup checklist, salon, services, stylists
- `/dashboard/availability` weekly hours, breaks, days off
- `/dashboard/bookings` bookings list with filters
- `app/api/auth/*` and `app/api/proxy/[...path]` are route handlers (login, logout, API proxy)

## Decisions (do not change without asking me)
- Look: pink, soft, rounded, mobile-first, widening to two columns on desktop. Font: Plus Jakarta Sans only (`next/font/google`, weights 400 to 700). No other font, no serif.
- Palette: background `#FFF5F7`, card `#FFFFFF`, primary `#B93F66` (buttons, with white text), primary-dark `#A93A5B`, soft tint `#FCE4EB`, text `#2B1B21`, muted `#6F565F`. Pill buttons, rounded-2xl cards, 44px minimum touch targets.
- Status badges: pending amber, confirmed green, cancelled grey, refunded blue.
- Photos are optional. Salons and stylists have a nullable `image_url`. When empty, show a pink gradient tile or an initial avatar. Owner-supplied images use `next/image` with `unoptimized`. No lorem ipsum, no invented stats or ratings.
- Not in the MVP: map, distance, promo banners, business hours on the salon page, ratings, reschedule.
- Landing page pricing: a light placeholder ("free while we launch, simple monthly plan later"). No made-up prices.
- Auth: the token never reaches JavaScript. Route handlers store it in an httpOnly cookie (`sb_token`, 30 minutes). The browser calls `/api/proxy/*` on our own domain, which adds the Authorization header. No CORS setup is needed because the browser never calls Render directly.
- Data: server components fetch public pages. TanStack Query for client data. API types are generated with `npm run types` (openapi-typescript from the live openapi.json). Never hand-type API shapes or guess fields.
- Money: integers in kobo, shown in naira by ONE helper (`src/lib/money.ts`).
- Time: shown in Africa/Lagos by ONE helper (`src/lib/time.ts`). The API stores UTC.

## Backend API
- Base URL env var: `API_URL` (server-only, no `NEXT_PUBLIC_` prefix) = `https://salonbook-api-etyz.onrender.com/api/v1`. Docs at `/docs`, schema at `/openapi.json`.
- Free tier: the first request after idle can take about 50 seconds. Show a "waking up" message and retry once.
- Roles: client and owner. Stylists have no login; owners create them.
- Booking statuses: pending, confirmed, cancelled, completed, no_show. Payment statuses: pending, paid, refund_pending, refunded, failed.
- A pending booking is held for 15 minutes. A client can have at most 3 pending bookings.
- Slots come back as ISO times with +01:00. Show them as given. `starts_at` on booking create takes the same value.
- `POST /bookings/{id}/pay` returns `authorization_url` (Paystack, test mode only).
- NEVER trust the Paystack redirect. Save the booking id in sessionStorage before redirecting, then on `/payment/callback` poll `GET /bookings/{id}` every 2 seconds for up to 60 seconds.
- Public stylist read: id, name, image_url, service_ids. Salons: name, address, phone, image_url, cancellation_hours, deposit_amount (no description, rating or hours).
- Services can have `price_type = quote` (price confirmed in person): show "Price on consultation" instead of a number. The deposit is always shown.
- Owner endpoints: `GET /salons/mine`, `GET /salons/{id}/bookings` (client name only, never email). Deleting something that has bookings returns 409: show a clear message.

## Environment variables (names only, never values)
`API_URL`

## Deployment
- Frontend on Vercel. Set `API_URL` in the Vercel dashboard for Production, Preview and Development. Redeploy after changing a variable.
- Function region Frankfurt (fra1), next to the Render backend.
- Never put secrets in client code. Server-only variables have no `NEXT_PUBLIC_` prefix.

---

## Stack
Next.js (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui, TanStack Query, Vitest + React Testing Library, ESLint + Prettier.

## Folder structure
```
src/
├── app/               # routes, layouts, loading.tsx, error.tsx
│   └── api/           # auth/* and proxy/[...path] route handlers
├── components/
│   ├── ui/            # shadcn/ui components live here
│   └── features/      # feature-specific components
├── lib/
│   ├── api.ts         # the single place for backend calls (browser: /api/proxy/*, server: API_URL)
│   ├── api-types.ts   # generated, do not edit by hand (npm run types)
│   ├── money.ts       # kobo to naira
│   ├── time.ts        # Africa/Lagos formatting
│   └── utils.ts
├── hooks/             # custom hooks (useX)
├── types/             # small shared types that are not API shapes
└── tests/             # or colocated *.test.tsx
```

## Naming conventions
- Components: `PascalCase` files and names (`BookingCard.tsx`). One component per file.
- Hooks: `useX` (`useBookings.ts`). Utilities and other files: `camelCase` or `kebab-case`, consistent within a folder.
- Route folders: kebab-case.
- Types and interfaces: `PascalCase`. Constants: `UPPER_SNAKE_CASE`.
- Branches: `feat/...`, `fix/...`, `chore/...`. Commits: Conventional Commits.

## Code rules
- Default to Server Components; add `"use client"` only when needed (state, effects, browser APIs, event handlers).
- All backend calls go through `lib/api.ts`; never scatter `fetch` with hardcoded URLs.
- Every page that fetches data handles loading, error (with retry) and empty states.
- 401: clear the cookie and go to `/login?next=`. 403: show a role message. 409 on booking: slot taken, refresh slots. 422: show the server's field errors.
- Forms: validate on the client, and always handle server validation errors too.
- Cancel dialog explains the refund rule: refund only if cancelled more than `cancellation_hours` before the start. Use `refund_due` from the API for the outcome.
- Accessibility: semantic HTML, a label on every input, `aria-label` on icon-only buttons, visible focus, keyboard-friendly, text contrast of 4.5:1.
- Mobile-first, responsive with Tailwind breakpoints.
- Use `next/image` for images and `next/link` for navigation.
- No `any`; no secrets in client code; no `console.log` left in commits.

## Rules for Claude
- Plan mode first. One branch per step, small commits, use the `commit` skill. Use the skills (`scaffold-web`, `new-page`, `new-component`, `test`) when a task matches.
- Commits show only me as author. Never add `Co-Authored-By` or "Generated with Claude Code" lines to commits or pull requests.
- Never read, print or edit `.env*` files. Update `.env.example` when adding a variable.
- Ask before adding new dependencies.
- Read the live `/openapi.json` before using an endpoint. Match the backend contract; if an endpoint is unclear, ask instead of guessing.
- Before I push: `npm run lint`, `npm run build` and `npm test` must pass. Run `/test` before declaring a task done.
- Use the `code-reviewer` subagent before every pull request, `ui-reviewer` when screens changed, and `test-writer` after a feature works.
- Use shadcn/ui components before writing custom ones; add new ones with the shadcn CLI.
- Never push, merge or deploy yourself.