# Repository Guidelines

## Project Structure & Module Organization
- `specs/` stores feature collateral; `specs/002-build-a-stamp/` contains the active plan, research, data model, contracts, and quickstart—update these before coding.
- `apps/stamp/` is the Next.js workspace. Pages live in `src/app`, shared UI in `src/components`, domain logic in `src/lib` or `src/features`, and Firebase wiring in `src/firebase.ts`.
- Shared utilities belong under `packages/` (e.g., `packages/logger/`). Unity content remains in `unity/interactive/`, and any physical assets sit in `assets/` with provenance notes.
- Co-locate tests beside implementation or in `apps/stamp/test` so coverage reporting stays aligned with the constitution.

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
- Format using `pnpm lint:fix` and confirm no Biome or ESLint diagnostics remain.

## Testing Guidelines
- Use Vitest with `@testing-library/react` + `@testing-library/jest-dom`. Name specs `*.test.ts` or `*.test.tsx`.
- Hit 100% statement and branch coverage for non-trivial files; validate with `pnpm coverage --filter stamp`.
- Follow @twada's testing patterns: prefer `render` from `@testing-library/react`, use `describe` blocks for grouping, and leverage `beforeEach` for shared setup.
- Follow TDD development: write failing tests first, then implement to make them pass.
- Exercise Firestore/Auth flows against the Firebase Emulator and stub external integrations (photobooth API, Google Forms) in tests.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative verbs (e.g., `add stamp redemption flow`, `fix sentry tagging`).
- Pull requests must supply a summary, linked issue/OKR, affected experience checklist, UI evidence, and references to updated docs in `docs/spec/`.
- Confirm lint and test runs in the PR body and tag reviewers from every impacted workspace (`apps/stamp`, `packages`, etc.).

## Security & Configuration Tips
- Enforce anonymous auth for attendees and email/password auth for staff; reflect rule changes in `apps/stamp/firestore.rules`.
- Never commit secrets. Extend `.env.example` when adding environment variables and distribute real values via 1Password.
- Record Remote Config or incident-response updates in `docs/spec/change-log.md` so on-site operators stay informed.
