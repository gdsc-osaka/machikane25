# Repository Guidelines
Remember to also check out docs/DDD.md and docs/TDD.md for deeper dives into Domain-Driven Development and Test-Driven Development practices.

## Project Structure & Module Organization
- `apps/stamp/` is the Next.js workspace. Pages live in `src/app`, shared UI in `src/components`, Domain-Driven Development files in `src/domain`, `src/infra`, `src/application`, Firebase wiring in `src/firebase.ts`, custom hooks in `src/hooks`, and i18n copy in `src/libs/i18n`.
- Co-locate tests beside implementation in `**/__tests__/*.test.{ts,tsx}` for unit testing or in `apps/stamp/test/integration` for integration testing so coverage reporting stays aligned with the constitution.

## Build, Test, and Development Commands
- `pnpm install` — sync workspace dependencies.
- `pnpm dev:stamp` — run the stamp rally app locally on http://localhost:4001 via Turbopack.
- `pnpm lint` / `pnpm lint:fix` — run Biome + ESLint; use the fix variant before committing.
- `pnpm test:stamp` and `pnpm coverage --filter stamp` — execute Vitest suites and enforce 100% coverage.
- `pnpm build:stamp` (or `pnpm build` for the full workspace) — produce production bundles before deployment.

## Coding Style & Naming Conventions
- TypeScript (5.x) with 2-space indentation is required. Follow Next.js conventions for files (`page.tsx`, `layout.tsx`, route directories).
- Compose UI with shadcn/Radix components and Tailwind 4 tokens; avoid ad-hoc inline styling.
- Fetch client data through SWR hooks; wrap mutations in server actions or API routes for revalidation support.
- Never use let or var; prefer const and immutable patterns. Favor functional programming (map, filter, reduce) over loops.
- Do not use for, while as long as possible; prefer array methods and recursion.
- Never use "as" type assertions; prefer proper typing and type guards.
- In DDD, never use classes; prefer plain objects and functions. Use interfaces for abstractions, union types and discriminated unions for variants, and higher-order functions for composition. Read docs/DDD.md for details.
- Format using `pnpm lint:fix` and confirm no Biome or ESLint diagnostics remain.
- Use FirestoreDataConverter for Firestore data mapping.

## Testing Guidelines
- Use Vitest with `@testing-library/react` + `@testing-library/jest-dom`. Name specs `*.test.ts` or `*.test.tsx`.
- Hit 100% statement and branch coverage for non-trivial files; validate with `pnpm coverage --filter stamp`.
- Follow TDD development: write failing tests first, then implement to make them pass. Read docs/TDD.md for details.
- Exercise Firestore/Auth flows against the Firebase Emulator and stub external integrations (photobooth API, Google Forms) in tests.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative verbs (e.g., `add stamp redemption flow`, `fix sentry tagging`).
- Pull requests must supply a summary, linked issue/OKR, affected experience checklist, UI evidence, and references to updated docs in `docs/spec/`.
- Confirm lint and test runs in the PR body and tag reviewers from every impacted workspace (`apps/stamp`, `packages`, etc.).

## Security & Configuration Tips
- Enforce anonymous auth for attendees and email/password auth for staff; reflect rule changes in `apps/stamp/firestore.rules`.
- Never commit secrets. Extend `.env.example` when adding environment variables and distribute real values via 1Password.
- Record Remote Config or incident-response updates in `docs/spec/change-log.md` so on-site operators stay informed.
