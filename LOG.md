# Log

## 2026-10-10

- Live URL recorded: https://salonbook-web-theta.vercel.app (Vercel production, answers 200).

- Dev-tool audit finding accepted for now: `npm audit` reports 9 high findings, all from one `braces` advisory (stack exhaustion on deeply nested patterns) reached through `fast-glob` in the shadcn CLI chain (`shadcn` -> `@shadcn/registry` / `ts-morph`) and in `eslint-config-next`. There is no patched `braces` release, and `npm audit fix` changes nothing. These are devDependencies used only on our machines and in CI at build and lint time, so they do not ship to users: `npm audit --omit=dev --audit-level=high` is clean. CI now blocks on that command and runs a plain `npm audit` as a non-blocking step so the findings stay visible. Revisit when `braces` has a fix.
