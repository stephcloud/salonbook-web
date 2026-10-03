---
name: scaffold-web
description: Create the initial Next.js project (TypeScript, Tailwind, testing, API client, layout, base folders). Use once at the start of a new project.
disable-model-invocation: true
---

# Scaffold Web

1. Read `CLAUDE.md` for the project name, stack, and folder structure.
2. Initialize Next.js with App Router, TypeScript, Tailwind, ESLint, and a `src/` directory (`npx create-next-app@latest`), in the current repo without overwriting `CLAUDE.md` or `.claude/`.
3. Add Vitest, React Testing Library, and jsdom; add `test`, `typecheck`, and `lint` scripts to `package.json`.
4. Create the folders from `CLAUDE.md`, plus:
   - `src/lib/api.ts`: fetch wrapper using `NEXT_PUBLIC_API_URL` with JSON handling and typed errors
   - `src/app/layout.tsx` with metadata and a base layout
   - `src/app/loading.tsx` and `src/app/error.tsx`
   - `src/components/ui/Button.tsx` and a test for it
   - `.env.example` with `NEXT_PUBLIC_API_URL=http://localhost:8000`
5. Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`. Report results and list dependencies added.
