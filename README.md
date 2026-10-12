# SalonBook (web)

SalonBook is a booking platform that many salons can use. Clients pick a service and a stylist, see real free times and pay a deposit to hold their spot. Salon owners register themselves, set up their salon, services, stylists and weekly hours, and share their salon link with customers.

This repository is the frontend. The API lives in the separate `salonbook-api` repository (FastAPI, hosted on Render).

**Live site:** https://salonbook-web-theta.vercel.app

## Stack

- Next.js (App Router) and React, TypeScript in strict mode
- Tailwind CSS and shadcn/ui
- TanStack Query for client-side data
- Vitest and React Testing Library
- ESLint and Prettier

## Run locally

```bash
npm i
cp .env.example .env.local   # then check API_URL (see below)
npm run dev                  # http://localhost:3000
```

One environment variable is needed:

| Name      | Where it is used | Notes                                                                 |
| --------- | ---------------- | --------------------------------------------------------------------- |
| `API_URL` | Server only      | Base URL of the SalonBook API. `.env.example` shows the expected form. |

`API_URL` has no `NEXT_PUBLIC_` prefix, so it never reaches the browser. The API is on a free tier, so the first request after a quiet spell can take about a minute.

## Scripts

| Command             | What it does                                                            |
| ------------------- | ----------------------------------------------------------------------- |
| `npm run dev`       | Start the dev server                                                    |
| `npm run build`     | Production build (it does not call the API)                             |
| `npm start`         | Serve the production build                                              |
| `npm run lint`      | ESLint                                                                  |
| `npm test`          | Run the Vitest suite once (`npm run test:watch` to keep it running)     |
| `npm run typecheck` | Generate Next route types, then `tsc --noEmit`                          |
| `npm run format`    | Prettier                                                                |
| `npm run types`     | Regenerate `src/lib/api-types.ts` from the live API's `/openapi.json`   |

`src/lib/api-types.ts` is generated: do not edit it by hand.

## Folder map

```
src/
├── app/                 routes, layouts, loading/error/not-found pages
│   └── api/             route handlers: auth/*, proxy/[...path], dashboard/stylists, time
├── components/
│   ├── ui/              shadcn/ui components
│   └── features/        components grouped by feature (auth, booking, bookings,
│                        dashboard, landing, nav, payment, salons, loading)
├── hooks/               custom hooks (useX)
├── lib/
│   ├── api.ts           browser and shared backend calls, types and helpers
│   ├── api-server.ts    server-only reads (public salon data, signed-in user)
│   ├── api-types.ts     generated API types
│   ├── money.ts         kobo to naira, the one money formatter
│   └── time.ts          Africa/Lagos formatting, the one time formatter
├── tests/               test setup and helpers
└── types/               small shared types that are not API shapes
```

Tests sit next to the code they cover as `*.test.ts(x)`.

## Auth design

- Login goes through our own route handler, which stores the token in an httpOnly cookie (`sb_token`, 30 minutes). The token never reaches JavaScript.
- The browser calls `/api/proxy/*` on our own domain. The proxy adds the `Authorization` header and forwards the call to the API.
- Because the browser never calls the API directly, no CORS setup is needed.
- Server components read the cookie to fetch pages for the signed-in user. A 401 clears the cookie and sends the user to `/login?next=`.

## Payments

The deposit is paid on Paystack (test mode only for now). The redirect back from Paystack is never trusted: the booking id is saved in `sessionStorage` before leaving, and `/payment/callback` polls the API for the booking's real status.

## Deploy

- Hosted on Vercel. Every push to `main` deploys to production, and every pull request gets a preview URL.
- Set `API_URL` in the Vercel dashboard for Production, Preview and Development. Redeploy after changing a variable.
- Function region is Frankfurt (`fra1`), next to the Render backend. It is set in the Vercel project settings, not in this repo.
- Pages that call the API are rendered on demand, so the build does not need the API to be awake.
- Keep secrets out of client code. Server-only variables have no `NEXT_PUBLIC_` prefix.
