# Repository Guidelines

## Project Structure & Module Organization
Each experience keeps its specification in `docs/spec/<experience>/`. Next.js frontends live in `apps/<experience>/` (for example `apps/photobooth/`), shared UI sits in `packages/ui/`, and common utilities belong in `packages/utils/`. Firebase or Node services stay under `services/<experience>/`, with their tests colocated (e.g. `services/interactive/tests/integration`). Unity content for the aquarium is tracked in `unity/interactive/`, and shared assets such as NFC maps land in `assets/` alongside a small README describing provenance.

## Build, Test, and Development Commands
- `pnpm install` — sync workspace dependencies.
- `pnpm dev:photo` — launch the Photobooth Next.js server for local work.
- `pnpm dev:stamp` — launch the Stamp Rally Next.js server for local work.
- `pnpm build` — produce production builds across all workspaces before a release.
- `pnpm lint` — check code style and formatting across the monorepo.
- `pnpm lint:fix` — auto-correct linting issues where possible.
- `pnpm test` — run all unit and integration tests across the monorepo.
- `pnpm coverage` — generate a coverage report for all tests.
- `Unity -runTests -projectPath unity/interactive` — execute Unity play mode tests headlessly.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation. Follow Next.js conventions (`page.tsx`, `layout.tsx`) and prefix custom hooks with `use*`. Share reusable presentation components through `packages/ui` and utilities through `packages/utils`. Firebase rules stay in `services/*/firestore.rules` with camelCase field names. Run `pnpm lint --fix` to apply Prettier and ESLint expectations before committing.

### Data fetching
Use SWR for client-side data fetching in Next.js, leveraging its caching and revalidation features. For server-side data fetching, prefer Next.js's built-in data fetching methods.

## Testing Guidelines
Use Vitest with unit specs stored alongside features in `path/to/dir/__tests__/*.test.{ts,tsx}` (for example `src/app/__tests__/page.test.tsx` or `src/components/__tests__/Header.test.tsx`); stub Gemini integrations via test doubles. Backend suites rely on the Firebase Emulator under `tests/integration`. Unity play mode specs live in `unity/interactive/Tests`. Target at least 80% statement coverage and verify with `pnpm test --filter apps/*` and `pnpm test --filter services/*`.

## Commit & Pull Request Guidelines
Keep commits concise, imperative, and scoped, mirroring existing history (e.g. `add obsidian specs`, `remove ds_store`). Every PR should include a summary, linked issue or OKR, affected experience checklist, and UI evidence (screenshots or clips). Tag reviewers from each impacted experience area and reference updated design docs by path so collaborators can sync Obsidian mirrors quickly.

## Security & Configuration Tips
Respect the access patterns in `docs/spec/Design Doc.md`: anonymous auth for stamp rally, operator accounts for Photobooth, and strict Firebase Storage rules. Never commit secrets; instead expose configuration via `.env.example` and 1Password. Note any incident-response or config adjustments in `docs/spec/change-log.md` to keep the on-site triage playbook current.
