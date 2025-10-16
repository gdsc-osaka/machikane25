# Implementation Plan: Stamp Rally Web Experience

**Branch**: `001-build-a-stamp` | **Date**: 2025-10-16 | **Spec**: [specs/001-build-a-stamp/spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-build-a-stamp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/scripts/bash/setup-plan.sh` for the execution workflow.

## Summary

Deliver the festival stamp rally web journey so attendees can collect NFC-driven stamps, complete the multilingual survey, and redeem prizes while staff manage redemptions securely. Execution leans on Firebase anonymous auth with Firestore-backed profiles, server-validated NFC tokens, SWR-wrapped listeners, a Google Form proxy route, canvas-rendered QR codes, and BarcodeDetector-admin flows hardened by Remote Config failover patterns.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript with Next.js 15.5 (App Router) and React 19  
**Primary Dependencies**: Firebase Web SDK (Auth, Firestore, Remote Config, Storage), SWR, React Hook Form, Sentry, shadcn/ui primitives, neverthrow error handling  
**Storage**: Firestore (stamp state, survey linkage, redemption logs), Firebase Storage (generated QR assets where applicable), Remote Config (maintenance messaging), Google Forms backend for survey archival  
**Testing**: Vitest + Testing Library, Firebase Emulator Suite, Lighthouse/Web Vitals profiling, manual kiosk device walkthroughs  
**Target Platform**: Festival kiosk browsers (Chromium-based) and attendee mobile browsers; admin tablet devices for QR scanning  
**Project Type**: Monorepo web application under `apps/stamp` with shared packages in `packages/ui` and `packages/utils`  
**Performance Goals**: <2s first meaningful interaction on kiosks, <300 ms p95 stamp award completion, stable UX under intermittent connectivity, 0 critical Sentry errors during festival window  
**Constraints**: Bilingual content parity (JA/EN), 100% statement & branch coverage, offline-tolerant messaging, anonymous attendee auth with secure admin gating, adherence to AGENTS.md conventions  
**Scale/Scope**: Peak festival throughput (~5k attendees, hundreds concurrent), survey completion rate ≥80%, redemption accuracy ≥98%

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality Stewardship**: Scope limited to `apps/stamp` with shared UI pulls from `packages/ui`; align with `docs/spec/stamp/Design Doc.md` and update spec plus `docs/spec/change-log.md` for any scope shifts; enforce lint/format via `pnpm lint` and Biome rules defined in AGENTS.md before PR.
- **Exhaustive Testing Mandate**: Execute `pnpm test`, `pnpm test:stamp`, and `pnpm coverage`; expand Vitest suites to cover NFC awarding, survey gating, QR redemption, and Remote Config branches; run Firebase Emulator suites locally and capture coverage evidence.
- **Unified Festival Experience**: Implement bilingual layouts per design doc, reusing typography/color tokens from `packages/ui`; document copy changes in spec; capture kiosk screenshots plus mobile screencasts demonstrating progress, survey, and reward flows; accessibility checklist includes focus states and touch target sizing.
- **Performance & Resilience Envelope**: Budget for <2 s initial render and <300 ms stamp write paths by batching Firestore access and prefetching SWR keys; implement Remote Config maintenance gates and Sentry performance alerts; rehearse degraded network scenarios and document fallback copy.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
apps/
├── stamp/
│   ├── src/
│   │   ├── app/                 # Next.js route handlers and layouts
│   │   │   └── __tests__/       # Define unit tests in __tests__/ for each directory
│   │   ├── components/          # shadcn/ui-based shared components
│   │   │   ├── __tests__/       # Unit tests for shared components, the same as above
│   │   │   └── ui/              # shadcn/ui primitives generated here
│   │   ├── features/            # Vertical slices per user story
│   │   ├── hooks/
│   │   ├── lib/                 # Firebase client, SWR keys, utils
│   │   └── styles/
│   ├── public/                  # Static assets (icons, QR fallbacks)
│   ├── test/                    # Vitest + Testing Library specs (integration + e2e)
│   └── package.json
└── stamp-foobar/                # (Future) Firebase functions if needed
docs/
└── spec/
    └── stamp/                   # Source-of-truth design documentation
```

**Structure Decision**: Maintain work within `apps/stamp/src` leveraging feature folders for attendee, survey, and admin flows while sourcing shared primitives from `packages/ui` and cross-cutting helpers from `packages/utils`; no new packages or services required.

## Post-Design Constitution Check

- **Code Quality Stewardship**: Spec, data model, and contracts updated under `specs/001-build-a-stamp/*`; no new packages introduced; plan enforces reuse of shared UI/utilities and documents scope changes for `docs/spec/stamp/Design Doc.md`.
- **Exhaustive Testing Mandate**: Test plan covers unit/integration specs for awarding, survey proxy, QR issuance, redemption logging, and maintenance toggles with emulator + coverage gates wired into quickstart.
- **Unified Festival Experience**: Design artifacts call out bilingual copy sources, accessibility checks, kiosk recordings, and proof-of-UX capture, ensuring alignment with stamp design doc.
- **Performance & Resilience Envelope**: Research + quickstart embed Lighthouse verification, SWR cache strategy, Remote Config maintenance flow, and incident logging steps satisfying latency and failover budgets.
## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
