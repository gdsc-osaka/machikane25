# Repository Guidelines

## Project Structure & Module Organization
- `apps/stamp/` is the Next.js workspace. Pages live in `src/app`, shared UI in `src/components`, ddd in `src/domain`, `src/infra`, `src/application`, and Firebase wiring in `src/firebase.ts`.
- Co-locate tests beside implementation or in `apps/stamp/test` so coverage reporting stays aligned with the constitution.

### apps/ directory map
```text
apps/
├── art/              # generative art app (Unity)
├── photo/            # photobooth app (Next.js)
├── photo-cleaner/    # photo cleanup firebase function
└── stamp/            # stamp rally app (Next.js)
```

### apps/stamp/ directory map
```text
apps/stamp/
├── public/                 # static assets served by Next.js
├── src/
│   ├── app/                # route handlers, layouts, and pages
│   │   ├── __tests__/      # route-level tests
│   │   ├── global-error.tsx # sentry error boundary
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── ui/             # shared shadcn-based primitives
│   ├── application/       # DDD application layer (service layer called by React components)
│   ├── infra/             # DDD infrastructure layer (firebase SDK implementations)
│   ├── domain/            # DDD domain layer (business logic, types, interfaces)
│   ├── firebase.ts         # firebase client SDK setup
│   ├── instrumentation.ts  # sentry instrumentation entrypoint
│   ├── instrumentation-client.ts
│   └── packages/
│       └── logger/         # app-scoped logging utilities
├── test/                   # integration/unit specs colocated externally
├── coverage/               # vitest coverage artifacts
├── apphosting.yaml
├── firebase.json
├── firestore.rules
└── next.config.ts
```

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
- Follow Domain-Driven Design (DDD) with `domain/`, `infra/`, and `application/` layers. Use neverthrow for Result types, ts-pattern for pattern matching, and obj-err for error handling.
- In DDD, never use classes; prefer plain objects and functions. Use interfaces for abstractions, union types and discriminated unions for variants, and higher-order functions for composition.
- Format using `pnpm lint:fix` and confirm no Biome or ESLint diagnostics remain.

### Example of obj-err, neverthrow, and ts-pattern in DDD
```typescript
import { errorBuilder, InferError } from 'obj-err';
import { ResultAsync } from 'neverthrow';
import { match } from 'ts-pattern';
import { z } from 'zod';
import { User } from '../domain/user';
import { UserRepository } from '../domain/user-repository';
const NotFoundError = errorBuilder('NotFoundError', z.object({ userId: z.string() }));
type NotFoundError = InferError<typeof NotFoundError>;
const createUser = (userRepository: UserRepository) => (name: string, email: string): ResultAsync<User, UserError> => User.create(name, email).asyncAndThen(userRepository.create);
```

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
