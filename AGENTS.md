# Repository Guidelines

## Project Structure & Module Organization
- `apps/stamp/` is the Next.js workspace. Pages live in `src/app`, shared UI in `src/components`, Domain-Driven Development files in `src/domain`, `src/infra`, `src/application`, Firebase wiring in `src/firebase.ts`, custom hooks in `src/hooks`, and i18n copy in `src/libs/i18n`.
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
- Do not use for, while as long as possible; prefer array methods and recursion.
- Never use "as" type assertions; prefer proper typing and type guards.
- In DDD, never use classes; prefer plain objects and functions. Use interfaces for abstractions, union types and discriminated unions for variants, and higher-order functions for composition.
- Format using `pnpm lint:fix` and confirm no Biome or ESLint diagnostics remain.
- Use FirestoreDataConverter for Firestore data mapping.

## Testing Guidelines
- Use Vitest with `@testing-library/react` + `@testing-library/jest-dom`. Name specs `*.test.ts` or `*.test.tsx`.
- Hit 100% statement and branch coverage for non-trivial files; validate with `pnpm coverage --filter stamp`.
- Follow TDD development: write failing tests first, then implement to make them pass.
- Exercise Firestore/Auth flows against the Firebase Emulator and stub external integrations (photobooth API, Google Forms) in tests.

This document below defines the core development philosophy, process, and coding standards for this project. The Claude Code agent is expected to strictly adhere to these guidelines at all times. The philosophy is heavily inspired by the teachings of Takuya Wada (t-wada) on Test-Driven Development (TDD).

### 1. Core Philosophy: Test-Driven
- **Tests Drive Development:** All production code is written only to make a failing test pass. Tests are not an afterthought; they are the specification and the driver of design.
- **Confidence in Refactoring:** A comprehensive test suite is our safety net. It allows us to refactor and improve the codebase fearlessly and continuously.
- **Testability Equals Good Design:** If code is difficult to test, it is a sign of poor design. The agent must prioritize creating code that is easy to test, which naturally leads to a loosely coupled and highly cohesive architecture.

### 2. The Development Cycle: Red-Green-Refactor-Commit
The agent must follow this iterative cycle for every change, no matter how small. The agent should explicitly state which phase it is in when generating code.

#### Phase 1: Red - Write a Failing Test
- **Goal:** To clearly define what needs to be accomplished.
- **Action:** Before writing any implementation code, create a concise, specific test that verifies a single piece of desired functionality.
- **Condition:** This test must fail (**RED**), as the corresponding implementation does not yet exist.

#### Phase 2: Green - Make the Test Pass
- **Goal:** To fulfill the requirements defined by the test.
- **Action:** Write the absolute minimum amount of code necessary to make the failing test pass (**GREEN**).
- **Condition:** Do not add extra functionality. Elegance is not the goal at this stage; simply passing the test is.

#### Phase 3: Refactor - Improve the Design
- **Goal:** To clean up the code while keeping all tests green.
- **Action:** With the safety of passing tests, improve the internal structure of the code. This includes, but is not limited to:
    - Removing duplication (DRY principle).
    - Improving names for clarity.
    - Simplifying complex logic.
    - Ensuring all coding standards listed below are met.
- **Condition:** All tests must remain **GREEN** throughout the refactoring process.

#### Phase 4: Commit - Save the Progress
- **Goal:** To record a functioning, small unit of work as a secure checkpoint.
- **Action:** After refactoring is complete and a final check confirms all tests are green, execute `git add .` to stage the changes. This serves as a stable checkpoint before proceeding to the next development cycle.
- **Condition:** The changes implemented in this cycle should represent a single, meaningful unit of work. The commit message should also concisely describe this work.

### 3. Strict Coding Standards & Prohibitions

#### 【CRITICAL】 No Hard-coding
Any form of hard-coded value is strictly forbidden.

- **Magic Numbers:** Do not use numeric literals directly in logic. Define them as named constants.
    - *Bad:* `if (age > 20)`
    - *Good:* `const ADULT_AGE = 20; if (age > ADULT_AGE)`
- **Configuration Values:** API keys, URLs, file paths, and other environmental settings MUST be loaded from configuration files (e.g., `.env`, `config.js`) or environment variables. They must never be present in the source code.
- **User-facing Strings:** Text for UI, logs, or errors should be managed via constants or localization files to facilitate maintenance and internationalization.

#### Other Key Standards
- **Single Responsibility Principle (SRP):** Every module, class, or function should have responsibility over a single part of the functionality.
- **DRY (Don't Repeat Yourself):** Avoid code duplication at all costs. Abstract and reuse common logic.
- **Clear and Intentional Naming:** Variable and function names must clearly communicate their purpose and intent.
- **Guard Clauses / Early Return:** Prefer early returns to avoid deeply nested `if-else` structures.
- **Security First:** Always treat user input as untrusted. Sanitize inputs and encode outputs to prevent common vulnerabilities (XSS, SQL Injection, etc.).

## Commit & Pull Request Guidelines
- Commit messages are short, imperative verbs (e.g., `add stamp redemption flow`, `fix sentry tagging`).
- Pull requests must supply a summary, linked issue/OKR, affected experience checklist, UI evidence, and references to updated docs in `docs/spec/`.
- Confirm lint and test runs in the PR body and tag reviewers from every impacted workspace (`apps/stamp`, `packages`, etc.).

## Security & Configuration Tips
- Enforce anonymous auth for attendees and email/password auth for staff; reflect rule changes in `apps/stamp/firestore.rules`.
- Never commit secrets. Extend `.env.example` when adding environment variables and distribute real values via 1Password.
- Record Remote Config or incident-response updates in `docs/spec/change-log.md` so on-site operators stay informed.
