# Repository Guidelines

## Project Structure & Module Organization
This repo coordinates specs and implementation for the Machikane Festival 2025 exhibits. The living design documents stay in `docs/spec`, with one subfolder per experience (`stamp`, `photobooth`, `interactive`, `robot`). When adding application code, place Next.js frontends inside `apps/<experience>/` and share reusable UI in `packages/ui`. Backend APIs and Firebase Functions belong under `services/<experience>/`, while Unity artefacts for the aquarium live in `unity/interactive`. Keep test fixtures next to the code they cover (e.g. `apps/stamp/__tests__`). Store shared assets such as NFC maps or marketing art under `assets/` with a short README describing the source.

## Build, Test, and Development Commands
Use `pnpm` workspaces (commit the lockfile) to manage apps. Standard flows:
- `pnpm install` keeps dependencies aligned.
- `pnpm dev --filter apps/photobooth` starts the Photo Booth Next.js server.
- `pnpm dev --filter services/art-backend` boots the interactive art API (Firebase emulator or Node server).
- `pnpm build` runs production builds across workspaces; execute before tagging a release.
Document Unity build steps in `unity/interactive/BUILD.md` and automate with `./scripts/unity-build.sh` so rehearsal machines can reproduce them.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation for web and backend code. Components and pages follow Next.js conventions (`page.tsx`, `layout.tsx`), hooks use `use*` prefix, and shared utilities live in `packages/utils`. Keep Firebase rule files in `services/*/firestore.rules` and name Firestore fields in camelCase. Unity scripts stay in PascalCase files with camelCase members. Run Prettier and ESLint (`pnpm lint --fix`) before committing; document any service-specific linters in README stubs.

## Testing Guidelines
Adopt Vitest or Jest for Next.js apps with colocated `*.test.ts(x)` files; stub Gemini calls with test doubles. Backend services should rely on the Firebase Emulator Suite with integration specs in `tests/integration`. Run `pnpm test --filter apps/*` and `pnpm test --filter services/*` before pushing, targeting ≥80% statement coverage. Unity play mode tests belong in `unity/interactive/Tests` and must be runnable with `Unity -runTests -projectPath unity/interactive`. Capture manual festival rehearsal scripts in `docs/runbooks/` and link them from relevant specs.

## Commit & Pull Request Guidelines
Follow the short imperative style visible in `git log` (`add obsidian specs`, `remove ds_store`). Keep commits scoped to a single concern and avoid WIP noise. Every PR should include: summary, linked issue/OKR, affected services checklist, and screenshots or clips for any UI change. Tag reviewers from each experience area and note related spec updates by path so Obsidian users can sync quickly.

## Security & Configuration Tips
Enforce the access controls described in `docs/spec/Design Doc.md`: anonymous auth for the stamp rally, pre-provisioned operator accounts for the photobooth, and tight Storage/Firebase rules. Never commit secrets; reference 1Password or Firebase config via `.env.example`. Log config or incident-handling updates in `docs/spec/change-log.md` to support on-site triage.
