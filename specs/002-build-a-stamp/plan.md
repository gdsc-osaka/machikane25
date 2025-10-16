# Implementation Plan: Stamp Rally Web Application

**Branch**: `002-build-a-stamp` | **Date**: 2025-10-16 | **Spec**: [specs/002-build-a-stamp/spec.md](specs/002-build-a-stamp/spec.md)
**Input**: Feature specification from `/specs/002-build-a-stamp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/scripts/bash/setup-plan.sh` for the execution workflow.

## Summary

Build the end-to-end stamp rally web experience in `apps/stamp`, covering NFC-triggered stamp claiming, progress tracking, survey submission routed to Google Forms, prize redemption with QR proofs, admin scanning, and photobooth uploads. Follow the architecture in `docs/spec/stamp/Design Doc.md`, leveraging Next.js 15 + SWR on Firebase (Auth, Firestore, Remote Config) while meeting success criteria SC-001–SC-004.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x (Next.js 15.5.5, React 19)  
**Primary Dependencies**: SWR 2.x, Firebase JS SDK 12.x, Jotai 2.x, shadcn UI (Radix primitives), Tailwind CSS 4, react-hook-form 7.x, zod 4.x, Sentry 10.x  
**Storage**: Firestore (participants, stamps, survey flags, redemption records), Firebase Remote Config (Google Form URL + maintenance state), Google Forms endpoint (survey payload handoff)  
**Testing**: Vitest 3.x with @testing-library/react + jest-dom matchers; firebase emulator for integration  
**Target Platform**: Firebase App Hosting serving a mobile-first Next.js web app for modern Chromium/Safari/Firefox, with admin tooling on desktop browsers  
**Project Type**: Web (Next.js full-stack)  
**Performance Goals**: Meet SC-001 (initial stamp <30s), SC-003 (90% first-scan redemption), keep SWR data fresh within 5s of mutation  
**Constraints**: Anonymous Firebase Auth only for participants, staff credentialed access for admin routes, NFC-triggered stamp tokens, survey submission must succeed even on captive networks  
**Scale/Scope**: Target 2.5k participant sessions per festival day with up to 5 concurrent admin scanners

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Experience-Scoped Delivery**: Scope is limited to the `stamp` experience; implementation stays in `apps/stamp` with supporting docs under `docs/spec/stamp/`. Update `docs/spec/stamp/Design Doc.md` plus `docs/spec/change-log.md` for any architectural/config deltas.
- **Next.js Monorepo Discipline**: Work touches `apps/stamp/src` and potentially shared helpers under `packages/logger`. Validate formatting via `pnpm lint` and `pnpm lint:fix` (workspace + app filters) before pushing.
- **100% Test Coverage Gate**: All new modules require Vitest specs in `apps/stamp/test` or colocated `__tests__` directories, keeping `pnpm test:stamp` and `pnpm coverage` at 100% statements/branches for non-trivial files.
- **SWR-Driven Data Flow**: Client views consume Firestore/REST via SWR hooks with mutation revalidation; server actions/route handlers encapsulate writes to prevent ad-hoc global state.
- **Secure Firebase & Configuration Discipline**: Enforce anonymous auth for attendees, email/pass for admins, and align Firestore/Storage rules with stamp requirements. Document `.env.example` additions (e.g., NFC tokens, Google Form endpoint) and log config changes in `docs/spec/change-log.md`.

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
```
apps/
  stamp/
    src/
      app/
      components/
      features/
      lib/
      packages/
      firebase.ts
    test/
packages/
  logger/
specs/
  002-build-a-stamp/
```

**Structure Decision**: The stamp rally feature lives in the Next.js workspace `apps/stamp`, with shared utilities promoted through existing package workspaces (e.g., `packages/logger`) and feature docs kept in `specs/002-build-a-stamp/`.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
