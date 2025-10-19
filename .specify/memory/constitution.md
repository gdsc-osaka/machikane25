<!--
Sync Impact Report
- Version change: none -> v1.0.0
- Modified principles: (initial adoption)
- Added sections: Preamble, Governing Metadata, Guiding Principles, Governance
- Removed sections: none
- Templates requiring updates:
  - [OK] .specify/templates/plan-template.md
  - [OK] .specify/templates/spec-template.md
  - [OK] .specify/templates/tasks-template.md
- Follow-up TODOs: none
-->

# Machikane 2025 Development Constitution

## Governing Metadata
- **Constitution Version**: v1.0.0
- **Ratified**: 2025-10-16
- **Last Amended**: 2025-10-16
- **Stewards**: GDG on Campus Osaka festival engineering team; tech leads `@harineko0`, `@Nagomu0128`, `@iusok3386`

## Preamble
The Machikane 2025 engineering team delivers the stamp rally, AI photo booth, and interactive
aquarium experiences for Osaka University's festival. This constitution establishes binding
guardrails so every change remains production-ready, bilingual, and resilient for on-site guests.

## Mission
Ship delightful multi-language festival experiences across web, Unity, and Firebase surfaces while
maintaining uncompromising quality, safety, and operational readiness throughout development,
dress rehearsals, and festival days.

## Guiding Principles

### Principle 1 - Code Quality Stewardship
- Developers MUST preserve the DDD layering (`domain`, `application`, `infra`) and shared UI
  contract in `apps/stamp`, reusing existing packages before adding new modules.
- Every merge MUST keep `pnpm lint` and `pnpm lint:fix` clean; contributors MUST write TypeScript
  with 2-space indentation, use `const` (no `let`/`var`), and follow shadcn/Tailwind 4 patterns
  instead of ad-hoc styling.
- All features MUST document impacted directories and specs under `docs/spec/` so reviewers can
  trace architectural decisions and cross-app effects.
- Shared logging and instrumentation MUST route through the scoped utilities in
  `apps/stamp/src/packages/logger` to retain consistent formatting and observability.

**Rationale**: The festival relies on a small on-site crew; consistent architecture and lint hygiene
keep the codebase understandable and prevent regressions during high-pressure deployments.

### Principle 2 - Exhaustive Testing Mandate
- Contributors MUST practice TDD: add failing Vitest suites before implementations and ensure
  `pnpm test:stamp` (and other app-specific test commands) succeed locally and in CI.
- Non-trivial files MUST maintain 100% statement and branch coverage, with exclusions documented in
  specs plus justification for future audits.
- Integration flows touching Firebase MUST exercise the Emulator Suite; remote services (Gemini,
  photobooth, Google Forms) MUST be stubbed for deterministic results.
- Tests MUST co-locate with implementations (`__tests__`, `*.test.ts[x]`, or `apps/stamp/test`) to
  preserve traceability and coverage reporting.

**Rationale**: Festival features cannot fail live; exhaustive automated validation is the only way to
protect on-site operations and shorten recovery time.

### Principle 3 - Unified Festival Experience
- Features MUST ship with synchronized Japanese and English copy, mapping to UX decisions captured
  in `docs/spec/Design Doc.md` and individual experience specs.
- UI work MUST use shared shadcn primitives, Radix patterns, and Tailwind tokens so guests receive a
  visually consistent journey across all booths.
- Flow changes MUST update the relevant design docs and record incident or Remote Config changes in
  `docs/spec/change-log.md` before release.
- Cross-experience integrations (e.g., photobooth to aquarium) MUST provide authenticated hand-offs
  so only legitimate festival interactions propagate between services.

**Rationale**: Machikane attendees expect a coherent story; disciplined content and UX governance
avoid fragmented flows and reduce operator confusion.

### Principle 4 - Performance & Resilience Envelope
- Critical guest actions (stamp check-in, photo capture, aquarium updates) MUST respond within 300 ms
  server processing and render meaningful UI feedback within 2 seconds on kiosk hardware.
- Remote Config MUST control incident states; engineers MUST define degraded-mode messaging and
  ensure `pnpm build` verifies fallbacks prior to deployment.
- All apps MUST emit Sentry telemetry with release tags and confirm alerts route to the shared
  on-call channel before festival operations.
- Data retention tasks (Firebase Functions for photo cleanup, aquarium pruning) MUST run on the
  documented cadence and be audited during pre-festival rehearsals.

**Rationale**: Responsive interactions and planned failovers preserve crowd flow, while observability
ensures issues surface before they cascade during festival hours.

## Governance

### Amendment Procedure
1. Draft amendments as pull requests referencing affected specs and principles.
2. Obtain explicit approval from the Tech Lead of each impacted workspace (`apps/photo`,
   `apps/stamp`, `apps/art`) and the festival program lead before merging.
3. Update this constitution, bump the version per the policy below, and document the decision in
   `docs/spec/change-log.md`.

### Versioning Policy
- Use semantic versioning: MAJOR for principle removals/redefinitions, MINOR for new principles or
  significant scope changes, PATCH for non-substantive clarifications.
- Record version, rationale, and date in the Governance Metadata table and Sync Impact Report each
  time the constitution changes.

### Compliance Review
- Before each milestone (monthly during development, weekly in the six weeks before the festival),
  reviewers MUST audit active workstreams against all principles and track deviations in
  `docs/spec/change-log.md` with owners and resolution dates.
- Release branches and production deployments MUST include a checklist confirming lint, test, Sentry
  configuration, Remote Config states, and bilingual content compliance.
