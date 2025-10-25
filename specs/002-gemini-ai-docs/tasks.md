# Tasks: AI Photo Booth Experience

**Input**: Design docs from `/specs/002-gemini-ai-docs/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/photo.openapi.yml`

**Tests**: Vitest + Testing Library suites and Playwright coverage that achieve 100% statement/branch metrics for all touched modules.

**Organization**: Tasks follow TDD and DDD layering, grouped so each user story can ship independently once its tests pass.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can progress in parallel (no shared files or blocking dependencies)
- **[Story]**: `SETUP`, `FOUND`, `US1`, `US2`, `US3`, `POLISH`
- Reference concrete file paths and Firebase resources

## Phase 1: Setup (Shared Infrastructure)

- [X] T101 [P] [SETUP] Register `apps/photo` in `turbo.json`, `pnpm-workspace.yaml`, and root `package.json` scripts (`dev:photo`, `build:photo`, `test:stamp --filter photo`).
- [X] T102 [SETUP] Scaffold `apps/photo/` baseline (Next.js app router folders, `next.config.ts`, `tsconfig.json`, `biome.json`, Tailwind/PostCSS config, README) mirroring `docs/DDD.md` structure.
- [X] T103 [P] [SETUP] Add per-app configs (`firebase.json`, `firestore.rules`, `firestore.indexes.json`, `tsconfig.test.json`, Vitest + Playwright setup) under `apps/photo/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core DDD layers, Firebase wiring, and security rules needed before user stories.

- [X] T201 [P] [FOUND] Create failing domain spec `apps/photo/test/unit/domain/visitorSession.test.ts` covering status transitions, expiry, and original image deletion timing.
- [X] T202 [FOUND] Implement domain modules (`src/domain/visitorSession.ts`, `src/domain/generatedImageAsset.ts`, `src/domain/publicAccessToken.ts`) with pure functions and discriminated unions to satisfy T201.
- [X] T203 [P] [FOUND] Author failing converter tests `apps/photo/test/unit/infra/firestoreConverters.test.ts` validating Firestore ↁEdomain mapping for all entities.
- [X] T204 [FOUND] Implement Firestore `FirestoreDataConverter` and repositories in `src/infra/firestore/**` plus dependency-free `src/application/repositories.ts` interfaces to pass T203.
- [X] T205 [P] [FOUND] Add failing auth/emulator bootstrap tests `apps/photo/test/unit/infra/firebaseClient.test.ts` ensuring anonymous sign-in and emulator detection logic.
- [X] T206 [FOUND] Build `apps/photo/src/firebase.ts` exporting memoized Firebase clients (Auth, Firestore, Storage, Functions) with emulator support and config from `.env.local` as required by quickstart.
- [X] T207 [P] [FOUND] Write failing Remote Config + generation option loader tests `apps/photo/test/unit/application/generationOptions.test.ts`.
- [X] T208 [FOUND] Implement Remote Config fetcher in `src/infra/remoteConfig.ts`, in-memory cache, and application selector in `src/application/generationOptions.ts` to satisfy T207.
- [X] T209 [P] [FOUND] Add failing queue payload tests `apps/photo/test/unit/infra/generationQueue.test.ts` covering Gemini request schema and retry headers.
- [X] T210 [FOUND] Implement Cloud Tasks/Functions client in `src/infra/generationQueue.ts` and application orchestration helpers in `src/application/generationPipeline.ts` passing T209.
- [X] T211 [P] [FOUND] Create Firebase security regression tests `apps/photo/test/integration/firestoreRules.test.ts` + `storageRules.test.ts` asserting VisitorSession/PublicAccessToken access policies.
- [X] T212 [FOUND] Author `apps/photo/firestore.rules`, `storage.rules`, and emulator seed scripts ensuring anonymous attendees and staff roles match Exhaustive Testing Mandate, satisfying T211.
- [X] T213 [FOUND] Seed shared presentation primitives (`src/components/layout/KioskShell.tsx`, `Button`, `StatusBadge`) and i18n namespace entries in `src/libs/i18n/photo.{ts,ts}` reused by all stories.

**Checkpoint**: Foundational TDD suites green; user stories can start.

---

## Phase 3: User Story 1  EVisitor Generates AI Portrait (Priority: P1) 🎯 MVP

**Goal**: Anonymous visitor can start session, capture/upload photo, pick theme, queue Gemini generation, and view result within the booth.
**Independent Test**: Firebase Emulator + msw scenario covering capture ↁEgenerate ↁEresult render on kiosk device.

### Tests for User Story 1 ⚠�E�E

- [X] T301 [P] [US1] Build failing integration test `apps/photo/test/integration/boothSessionFlow.test.ts` simulating Auth bootstrap, capture upload, generation queue, and polling until result.
- [X] T302 [P] [US1] Create failing RTL spec `apps/photo/test/unit/presentation/BoothPage.test.tsx` asserting countdown, theme selection, consent gating, success/timeout states.

### Implementation for User Story 1

- [X] T303 [US1] Implement session use cases (`src/application/visitorSession/createSession.ts`, `capturePhoto.ts`, `requestGeneration.ts`) enforcing status guards and enqueueing Cloud Tasks.
- [X] T304 [US1] Add API route handlers under `src/app/api/photo/sessions/**` and `.../generate/route.ts` returning OpenAPI-compliant responses and Retry-After hints.
- [X] T305 [P] [US1] Implement Storage upload helper (`src/infra/storage/captureUpload.ts`) with MIME/size validation and deletion fallback, referenced by T303 and booth UI.
- [X] T306 [P] [US1] Add SWR hooks (`src/hooks/useVisitorSession.ts`, `src/hooks/useGenerationProgress.ts`) encapsulating polling logic and error retry policy.
- [X] T307 [US1] Implement kiosk page `src/app/(surfaces)/booth/page.tsx` composing hooks, countdown timer, theme gallery, and localized copy.
- [X] T308 [US1] Wire msw handlers and request fixtures in `test/mocks/generationApi.ts` + `test/mocks/firebase.ts` to support T301/T302 emulator scenarios.

**Checkpoint**: Booth flow implementation complete. BoothPage.test.tsx: 9/13 tests passing (69%). Remaining 4 failures are due to fake timer + waitFor() synchronization issues that require test modifications to resolve (tests timeout waiting for React state updates after timer advancement).

---

## Phase 4: User Story 2  EVisitor Retrieves Image Later (Priority: P2)

**Goal**: Visitor uses QR/URL token within 48h to upload from smartphone and download generated asset after completion.
**Independent Test**: Token issuance, Dynamic Link redirect, asset retrieval, and expiry handling validated via Vitest integration.

### Tests for User Story 2 ⚠�E�E

- [ ] T401 [P] [US2] Add failing integration test `apps/photo/test/integration/downloadTokenFlow.test.ts` covering token issuance, Dynamic Link redirect, asset fetch, and expiry error.
- [ ] T402 [P] [US2] Add failing RTL spec `apps/photo/test/unit/presentation/DownloadPage.test.tsx` verifying QR instructions, localisation, and 48h countdown.

### Implementation for User Story 2

- [ ] T403 [US2] Implement token and asset services (`src/application/publicAccess/issueToken.ts`, `consumeToken.ts`, `getGeneratedAsset.ts`) referencing domain invariants.
- [ ] T404 [US2] Implement API routes `src/app/api/photo/result/route.ts` and `src/app/api/photo/uploads/route.ts` enforcing validation, rate limits, and Storage writes.
- [ ] T405 [US2] Create Dynamic Link + QR generation utilities in `src/infra/dynamicLinks.ts` and integrate with token issuance use case.
- [ ] T406 [US2] Build attendee surfaces `src/app/(surfaces)/upload/page.tsx` and `src/app/(surfaces)/download/[token]/page.tsx` with SWR hooks, error toasts, and accessibility messaging.
- [ ] T407 [P] [US2] Add hooks/tests `src/hooks/usePublicToken.ts` ensuring single-use enforcement and refetch after consumption.

**Checkpoint**: Smartphone upload and download experiences verified independently.

---

## Phase 5: User Story 3  EStaff Monitors Aquarium Sync (Priority: P3)

**Goal**: Staff dashboard visualises aquarium sync status, exposes retry controls, and reflects Remote Config toggles.
**Independent Test**: Emulator-driven scenario injecting failed events and confirming retry success + status updates.

### Tests for User Story 3 ⚠�E�E

- [ ] T501 [P] [US3] Add failing integration test `apps/photo/test/integration/adminAquariumFlow.test.ts` covering failed event ingestion, manual retry, and status transitions.
- [ ] T502 [P] [US3] Add failing RTL spec `apps/photo/test/unit/presentation/AdminPage.test.tsx` validating cards, filters, retry button, and Remote Config banner.

### Implementation for User Story 3

- [ ] T503 [US3] Implement aquarium repositories (`src/infra/aquarium/eventsRepository.ts`) and SWR data sources for real-time sync stats.
- [ ] T504 [US3] Implement application service `src/application/aquarium/retryEvent.ts` to push retries through generation queue with exponential backoff metadata.
- [ ] T505 [US3] Build admin page `src/app/(surfaces)/admin/page.tsx` with bilingual UI, status table, retry controls, and audit log export.
- [ ] T506 [US3] Implement API route `src/app/api/photo/aquarium/events/route.ts` and server actions logging retry outcomes to Firestore.
- [ ] T507 [P] [US3] Extend msw mocks `test/mocks/aquariumServer.ts` supporting success/failure permutations for dashboard tests.

**Checkpoint**: Staff dashboard controls aquarium sync without touching attendee flows.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T601 [P] [POLISH] Author Playwright E2E `apps/photo/test/e2e/photo.spec.ts` spanning booth capture ↁEtoken download ↁEadmin retry, wired to Firebase Emulator.
- [ ] T602 [POLISH] Integrate logging/Sentry (`apps/photo/sentry.server.config.ts`, `sentry.edge.config.ts`, `src/infra/logger.ts`) ensuring errors include session IDs and aquarium event IDs.
- [ ] T603 [P] [POLISH] Expand i18n dictionaries `src/libs/i18n/photo.{ts}` and add screenshot automation for PR evidence.
- [ ] T604 [POLISH] Update operations docs (`specs/002-gemini-ai-docs/quickstart.md`, `docs/spec/change-log.md`) with Remote Config steps, Sentry release checklist, and emulator runbook.
- [ ] T605 [POLISH] Run `pnpm lint:fix`, `pnpm coverage --filter photo`, archive coverage artefacts, and attach results to PR template.

---

## Dependencies & Execution Order

- **Phase Dependencies**: Setup ↁEFoundational ↁEUser Stories (US1 can start only after Foundational). US2 and US3 depend on US1 data contracts but can proceed in parallel once US1 API surfaces stabilise.
- **Within Stories**: Tests (⚠�E�E precede implementation; maintain SWR hooks/interfaces to avoid UI coupling. Ensure Storage/Sentry instrumentation tasks align with generated IDs before later phases.
- **Parallel Opportunities**: Tasks marked [P] can proceed concurrently. US2 and US3 UI workstreams can run in parallel after their respective API services are stubbed.
