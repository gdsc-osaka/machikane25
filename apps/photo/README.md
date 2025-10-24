## AI Photo Booth Workspace

This workspace hosts the festival photo booth built on the Next.js App Router. The code follows the functional Domain-Driven Design layers outlined in `docs/DDD.md` and uses Test-Driven Development practices from `docs/TDD.md`. Keep dependencies isolated to this app and prefer composition over classes.

## Directory Map

- `src/app` – Route handlers and presentation components for kiosk, viewer, upload, and admin surfaces.
- `src/components` – Shared UI primitives built with shadcn/Radix + Tailwind v4 tokens; keep presentation-only.
- `src/application` – Use-case coordinators that orchestrate domain logic and infrastructure gateways.
- `src/domain` – Pure business rules expressed as immutable data + discriminated unions; no framework imports.
- `src/infra` – Firebase adapters, data mappers, and integration clients; depend on domain contracts only.
- `src/hooks` – SWR-based client hooks and memoized accessors.
- `src/libs/i18n` – Localised copy for kiosk, admin, and attendee flows.
- `test` – Unit and integration suites co-located per feature.

## Commands

```bash
pnpm dev:photo          # Run the kiosk surfaces with Turbopack on http://localhost:4000
pnpm test:photo         # Execute Vitest suites (requires Firebase Emulator Suite for infra specs)
pnpm coverage --filter photo   # Enforce 100% statements/branches for touched modules
pnpm lint:fix           # Run Biome/ESLint with autofix before committing
```

Tailwind v4 is configured via `@tailwindcss/postcss`. Add tokens in `globals.css` and avoid inline styles. When composing UI, prefer server components for data loading and encapsulate mutations inside server actions or API routes to ensure revalidation hooks fire correctly.

## Standards Checklist

- Use `const` and immutable patterns; favour array methods (`map`, `filter`, `reduce`) instead of loops.
- No `as` assertions—add precise types, guards, or schema parsers.
- Handle errors with explicit `try`/`catch` blocks and domain-specific error objects; neverthrow and obj-err are not used.
- Update `docs/spec/change-log.md` whenever operational behaviour changes.
