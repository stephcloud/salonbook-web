---
name: new-page
description: Add a new route/page with data fetching, loading, error, and empty states. Use when the user asks for a new page or screen.
---

# New Page

Ask (if not given): route path, what it shows, which backend endpoint(s), whether it needs auth.

Follow `CLAUDE.md` conventions. Create:
1. `src/app/<route>/page.tsx`: Server Component by default; fetch through `lib/api.ts`.
2. `loading.tsx` and `error.tsx` for the route when it fetches data.
3. Types in `src/types/` for the API response (match the backend schema).
4. Feature components in `src/components/features/<feature>/`; client components only where interactivity is needed.
5. A test for the key behavior (renders data, empty state, error state).

Make it responsive and accessible. Then run `/test` and fix failures. Summarize files created.
