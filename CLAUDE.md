# Project Context

<!-- EDIT PER PROJECT: fill in this section, leave the rest as is. -->
## Project
- Name: <project>-web
- Purpose: <one or two lines>
- Backend repo: <project>-api (FastAPI on Render)
- Deployed on: Vercel (auto-deploys from `main`)

## Pages / routes
<!-- e.g. / (landing), /login, /dashboard, /bookings/[id] -->

## Backend API
- Base URL env var: `NEXT_PUBLIC_API_URL`
- Endpoints used: <!-- e.g. POST /api/v1/auth/login, GET /api/v1/bookings -->
- Auth approach: <!-- e.g. JWT in httpOnly cookie -->

## Environment variables (names only, never values)
`NEXT_PUBLIC_API_URL`

## Deployment
- Frontend on Vercel; set env vars in the Vercel dashboard (Production and Preview)
- Only variables prefixed `NEXT_PUBLIC_` are exposed to the browser; never put secrets in them
- After deploying, add the Vercel URL to `CORS_ORIGINS` in the backend
- Render free tier sleeps when idle, so the first API call may be slow: show loading states

---

## Stack
Next.js (App Router), TypeScript (strict), Tailwind CSS, Vitest + React Testing Library, ESLint + Prettier.

## Folder structure
```
src/
├── app/               # routes, layouts, loading.tsx, error.tsx
├── components/
│   ├── ui/            # generic, reusable (Button, Input, Modal)
│   └── features/      # feature-specific components
├── lib/
│   ├── api.ts         # the single fetch wrapper for the backend
│   └── utils.ts
├── hooks/             # custom hooks (useX)
├── types/             # shared TypeScript types matching backend schemas
└── tests/             # or colocated *.test.tsx
```

## Naming conventions
- Components: `PascalCase` files and names (`UserCard.tsx`). One component per file.
- Hooks: `useX` (`useBookings.ts`). Utilities and other files: `camelCase` or `kebab-case`, consistent within a folder.
- Route folders: kebab-case (`booking-slots`).
- Types and interfaces: `PascalCase` (`Booking`, `BookingResponse`). Constants: `UPPER_SNAKE_CASE`.
- Env vars: public ones start with `NEXT_PUBLIC_`.
- Branches: `feature/...`, `fix/...`, `chore/...`. Commits: Conventional Commits.

## Code rules
- Default to Server Components; add `"use client"` only when needed (state, effects, browser APIs, event handlers).
- All backend calls go through `lib/api.ts`; never scatter `fetch` with hardcoded URLs.
- Type API responses; keep types in `types/` aligned with the backend schemas.
- Every page that fetches data handles loading, error, and empty states.
- Forms: validate on the client, but always handle server validation errors (422) too.
- Accessibility: semantic HTML, labels on inputs, alt text, keyboard-friendly.
- Mobile-first, responsive with Tailwind breakpoints.
- Use `next/image` for images and `next/link` for navigation.
- No `any`; no secrets in client code; no `console.log` left in commits.

## Rules for Claude
- Never read or edit `.env*` files. Update `.env.example` when adding a variable.
- Ask before adding new dependencies.
- Run `/test` before declaring a task done.
- Use the `code-reviewer` subagent after significant changes and `ui-reviewer` after UI work.
- Match the backend contract; if an endpoint is unclear, ask instead of guessing.
