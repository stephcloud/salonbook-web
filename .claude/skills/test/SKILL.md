---
name: test
description: Run lint, type-check, tests, and a production build, then summarize and fix failures.
allowed-tools: Bash(npm run lint:*), Bash(npm run typecheck:*), Bash(npm run test:*), Bash(npm run build:*)
---

# Test

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test -- --run`
4. `npm run build` (catches errors that only appear in production builds)
5. For any failure, find the real cause, fix it, and re-run. Do not delete or weaken tests, and do not silence errors with `any` or `@ts-ignore`.
6. Report pass/fail for each step and what you changed.
