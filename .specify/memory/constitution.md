<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0
- Modified principles: Experience-Scoped Delivery → Code Quality Stewardship; Next.js Monorepo Discipline → Code Quality Stewardship; 100% Test Coverage Gate → Exhaustive Testing Mandate
- Added sections: Unified Festival Experience, Performance & Resilience Envelope
- Removed sections: SWR-Driven Data Flow, Secure Firebase & Configuration Discipline (folded into new principles)
- Templates requiring updates:
  ✅ .specify/templates/plan-template.md
  ✅ .specify/templates/tasks-template.md
- Follow-up TODOs: None
-->

# machikane25 Constitution

## Core Principles

### I. Code Quality Stewardship
machikane25 safeguards clarity and maintainability by enforcing uncompromising code quality standards. Contributors MUST:
- Capture scope or behavior changes in `docs/spec/<experience>/` before implementation, keeping specs, change logs, and shipped code aligned.
- Respect the monorepo structure: feature code under `apps/<experience>/`, shared UI in `packages/ui`, shared utilities in `packages/utils`, backend services in `services/<experience>/`, Unity content in `unity/interactive/`, and shared assets with provenance notes in `assets/`.
- Follow the TypeScript/Next.js conventions defined in the design docs: two-space indentation, route-file naming (`page.tsx`, `layout.tsx`), typed domain layers (application/service/domain) as illustrated in `docs/spec/Design Doc.md`, and reuse existing components or hooks instead of duplicating logic.
Rationale: Clear architectural boundaries and consistent style make rapid festival-week fixes safe and keep cross-experience teams synchronized.

### II. Exhaustive Testing Mandate
Quality gates remain absolute. Contributors MUST:
- Author unit, integration, and journey tests alongside features so that every non-trivial file reaches 100% statement and branch coverage, documenting any exclusions with explicit approval.
- Run the relevant Vitest suites (`pnpm test`, `pnpm test:stamp`, `pnpm test:photo`, `pnpm test:photo-cleaner`, and `pnpm coverage`) before review, ensuring failures are addressed locally.
- Exercise Firebase Emulator, Unity play mode tests, and any Gemini test doubles described in specs so that event-day regressions are caught before deployment.
Rationale: Visitors get a single festival weekend; exhaustive automated testing is the only shield against catastrophic booth outages.

### III. Unified Festival Experience
Stamp rally interfaces must feel cohesive across every touchpoint. Contributors MUST:
- Deliver bilingual UX (Japanese/English) with consistent copy, visual styling, and interaction patterns, pulling shared primitives from `packages/ui` and updating layout tokens when colors or typography evolve.
- Keep navigation, state transitions, and NFC-triggered flows true to `docs/spec/stamp/Design Doc.md`, documenting any UX or content change in the corresponding spec before merge.
- Validate accessibility and kiosk-readiness (large targets, offline-safe messaging) on actual device classes listed in the design docs and capture UI evidence in PRs.
Rationale: Attendees traverse multiple booths; a unified, accessible interface maintains trust and reduces operator intervention.

### IV. Performance & Resilience Envelope
The stamp rally must remain responsive on constrained event networks. Contributors MUST:
- Keep first meaningful interaction under 2 seconds on target kiosk hardware by minimizing JavaScript payloads, leveraging Next.js static generation where possible, and profiling with Lighthouse or Web Vitals.
- Use SWR caching and incremental revalidation to cap Firestore reads, ensure `/stamp` awards complete within 300 ms p95, and prefetch assets for critical flows (home → stamp → gift).
- Respect Remote Config-driven failover: implement maintenance states, NFC degradation paths, and incident banners exactly as specified, logging incident responses in `docs/spec/change-log.md` and instrumenting Sentry performance alerts.
Rationale: Fast, resilient flows keep attendee queues moving, even when campus Wi-Fi degrades or hardware recycles mid-event.

## Operational Standards

- Use the pnpm workflows from `README.md` for installing, linting, testing, coverage, deployment, and Firebase operations; keep `pnpm lint` clean before review.
- Store secrets outside the repo, update `.env.example` whenever configuration keys change, and note operational adjustments in `docs/spec/change-log.md`.
- Maintain Firebase rules and authentication modes per `docs/spec/Design Doc.md`, ensuring anonymous access for stamp rally users and operator controls gated through admin auth.
- Record performance budgets, UX decisions, and asset provenance in the relevant design docs so downstream teams can audit compliance quickly.

## Delivery Workflow

- Create or refresh feature specs before implementation, guaranteeing every user story is independently testable and traces back to core principles.
- Generate `plan.md` via `/speckit.plan`, maintain research/data-model/quickstart artifacts, and keep `tasks.md` synchronized with user stories, including explicit entries for testing, UX verification, and performance validation work.
- Ensure every change includes automated test updates that satisfy the Exhaustive Testing Mandate and attach PR evidence (screenshots or clips) demonstrating bilingual UX compliance.
- Secure approval from the Tech Lead(s) of each affected experience before merge, documenting constitution compliance in the PR checklist.

## Governance

- This constitution supersedes conflicting guidance; exceptions require written consent from all affected Tech Leads (`apps/photo`, `apps/stamp`, `apps/art`).
- Amendments require a documented proposal outlining principle impacts, updates to dependent templates, and an entry in `docs/spec/change-log.md` prior to adoption.
- Semantic versioning applies: MAJOR for principle removals or incompatible governance changes, MINOR for new principles or substantive expansions, PATCH for clarifications.
- Compliance reviews occur on every PR. The Constitution Check in `plan.md` is the auditable gate; code that violates any principle MUST NOT merge until remediated.

**Version**: 2.0.0 | **Ratified**: 2025-10-16 | **Last Amended**: 2025-10-16
