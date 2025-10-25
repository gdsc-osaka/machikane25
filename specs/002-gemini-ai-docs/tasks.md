# Tasks: AI Photo Booth Experience

**Input**: Design docs from /specs/002-gemini-ai-docs/
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `Design Doc.md`

**Tests**: Vitest + Testing Library suites and Playwright coverage that achieve 100% statement/branch metrics for all touched modules.

**Organization**: Tasks follow TDD and DDD layering, grouped so each user story can ship independently once its tests pass.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can progress in parallel (no shared files or blocking dependencies)
- **[Story]**: SETUP, FOUND, US1, US2, US3, POLISH
- Reference concrete file paths and Firebase resources

## Phase 1: Setup (Shared Infrastructure)

- [ ] T101 [P] [SETUP] Register `apps/photo` in `turbo.json`, `pnpm-workspace.yaml`, and root `package.json` scripts (`dev:photo`, `build:photo`, `test:photo --filter photo`).
- [ ] T102 [SETUP] Scaffold `apps/photo/` baseline (Next.js app router folders, `next.config.ts`, `tsconfig.json`, `biome.json`, Tailwind/PostCSS config, README) mirroring `plan.md` structure (src/app, src/domain, src/application, src/infra, src/components).
- [ ] T103 [P] [SETUP] Add per-app configs (`firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `tsconfig.test.json`, Vitest + Playwright setup) under `apps/photo/`.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core DDD layers, Firebase wiring, and security rules needed before user stories.

- [ ] T201 [P] [FOUND] Create failing domain spec `apps/photo/test/unit/domain/booth.test.ts` (covering Booth state transitions from data-model.md) and `photo.test.ts` (covering GeneratedPhoto, UploadedPhoto).
- [ ] T202 [FOUND] Implement domain modules (`src/domain/booth.ts`, `src/domain/photo.ts`, `src/domain/options.ts`) with pure functions and types based on `data-model.md` to satisfy T201.
- [ ] T203 [P] [FOUND] Author failing converter tests `apps/photo/test/unit/infra/firestoreConverters.test.ts` validating Firestore ↁEdomain mapping for booths, generatedPhotos, uploadedPhotos, options.
- [ ] T204 [FOUND] Implement Firestore FirestoreDataConverter and repositories in `src/infra/firebase/firestore/**` plus dependency-free `src/application/repositories.ts` interfaces to pass T203.
- [ ] T205 [P] [FOUND] Add failing auth tests `apps/photo/test/unit/infra/firebaseAuth.test.ts` ensuring anonymous sign-in (for visitors) and admin token verification (for staff) logic.
- [ ] T206 [FOUND] Build `apps/photo/src/libs/firebase/client.ts` (client SDK) and `server.ts` (Admin SDK) exporting memoized Firebase clients (Auth, Firestore, Storage) with emulator support.
- [ ] T207 [P] [FOUND] Write failing GenerationOption loader tests `apps/photo/test/unit/application/generationOptions.test.ts` (TDD for GenerationService).
- [ ] T208 [FOUND] Implement GenerationService (`src/application/generationService.ts`) to load options collection from Firestore (per `data-model.md`) to satisfy T207.
- [ ] T209 [P] [FOUND] Add failing GenerationService tests `apps/photo/test/unit/application/generationService.gemini.test.ts` covering Gemini API request schema (msw mock).
- [ ] T210 [FOUND] Extend GenerationService (`src/application/generationService.ts`) and `src/infra/gemini/client.ts` to handle AI generation requests (FR-003) passing T209.
- [ ] T211 [P] [FOUND] Create Firebase security regression tests `apps/photo/test/integration/firestoreRules.test.ts` + `storageRules.test.ts` asserting access policies (per Design Doc - admin R/W, anonymous R/W for specific paths).
- [ ] T212 [FOUND] Author `apps/photo/firestore.rules`, `storage.rules`, and emulator seed scripts ensuring anonymous attendees and admin (Custom Claim) roles, satisfying T211.
- [ ] T213 [FOUND] Implement AuthService (`src/application/authService.ts`) and `src/infra/firebase/authAdmin.ts` for admin token validation and custom token creation (per Design Doc).
- [ ] T214 [FOUND] Implement Next.js Middleware `apps/photo/src/middleware.ts` (TDD) using AuthService to protect admin routes (/admin, /photos).
- [ ] T215 [FOUND] Seed shared presentation primitives (`src/components/ui/Button.tsx`, `src/components/layout/KioskShell.tsx`) and i18n setup (`src/libs/i18n/`).

**Checkpoint**: Foundational TDD suites green; user stories can start.

## Phase 3: User Story 1 ↁEVisitor Generates AI Portrait (Priority: P1) 🎯 MVP

**Goal**: Anonymous visitor can use Control Page and Display Page, capture via Webcam OR upload via Image Upload Page, pick theme, and view result.
**Independent Test**: Firebase Emulator + msw scenario covering Booth state sync, Capture/Upload ↁEGenerate ↁEResult render.

### Tests for User Story 1 ⚠EE

- [ ] T301 [P] [US1] Build failing integration test `apps/photo/test/integration/boothSessionFlow.test.ts` simulating Auth (anonymous), Booth state updates, `capture/upload`, generation queue, and polling.
- [ ] T301 [P] [US1] Build failing integration test `apps/photo/test/integration/boothSessionFlow.test.ts` simulating Auth (anonymous), Booth state updates, `capture/upload`, generation queue, and polling.
- [ ] T302 [P] [US1] Create failing RTL spec `apps/photo/test/unit/app/control.test.tsx` (Control Page) asserting state-based UI (idle, menu, generating, completed) and interactions (start, option select, generate, QR display).
- [ ] T303 [P] [US1] Create failing RTL spec `apps/photo/test/unit/app/display.test.tsx` (Display Page) asserting state-based UI (idle, menu (Upload QR), capturing (Webcam), generating, completed (Result)).
- [ ] T304 [P] [US1] Create failing RTL spec `apps/photo/test/unit/app/upload.test.tsx` (Image Upload Page) asserting file input, validation, and upload submission (FR-002).

### Implementation for User Story 1

- [ ] T305 [US1] Implement BoothService (`src/application/boothService.ts`) use cases (TDD) for managing Booth state transitions (per data-model.md: createSession, startCapture, selectOptions, startGeneration, completeGeneration, resetIdle).
- [ ] T306 [US1] Implement PhotoService (`src/application/photoService.ts`) use cases (TDD) for uploadUserPhoto (FR-002) and deleteUsedPhoto (FR-006).
- [ ] T307 [P] [US1] Add SWR hooks `src/hooks/useBoothState.ts` (real-time Firestore subscription to booths/[boothId]) and `src/hooks/useGenerationOptions.ts`.
- [ ] T308 [US1] Implement Display Page (`src/app/display/[boothId]/page.tsx`) using useBoothState to show UI based on Booth.state (Idle msg, Upload QR, Webcam feed, Generating msg, Result Image) (per Design Doc).
- [ ] T309 [US1] Implement Control Page (`src/app/control/[boothId]/page.tsx`) using useBoothState and BoothService / GenerationService calls (Idle start, Option select, Generate button, Download QR) (per Design Doc).
- [ ] T310 [US1] Implement Image Upload Page (`src/app/upload/[boothId]/page.tsx`) using PhotoService to upload to uploadedPhotos (per Design Doc).
- [ ] T311 [US1] Implement Server Actions / API Routes used by T308-T310, linking UI interactions to BoothService and GenerationService.

**Checkpoint**: US1 flow (Capture/Upload, Generate, View) complete.

## Phase 4: User Story 2 ↁEVisitor Retrieves Image Later (Priority: P2)

**Goal**: Visitor uses QR/URL (from Control Page) within 24 hours to download the generated asset.
**Independent Test**: Download Page access via photoId validated, including 24h expiry check.

### Tests for User Story 2 ⚠EE

- [ ] T401 [P] [US2] Add failing integration test `apps/photo/test/integration/downloadFlow.test.ts` covering GeneratedPhoto fetch and expiry check (FR-004: 24h limit).
- [ ] T402 [P] [US2] Add failing RTL spec `apps/photo/test/unit/app/download.test.tsx` (Download Page) verifying image render, download button, and expiry/not-found messages.

### Implementation for User Story 2

- [ ] T403 [US2] Extend GenerationService (`src/application/generationService.ts`) with getGeneratedPhoto(photoId) (TDD), enforcing 24-hour access limit based on createdAt (FR-004).
- [ ] T404 [US2] Implement Download Page (`src/app/download/[boothId]/[photoId]/page.tsx`) using GenerationService to fetch and display the image or expiry message.

**Checkpoint**: US2 flow (Download via 24h-valid URL) complete.

## Phase 5: User Story 3 ↁEStaff Monitoring & Operations (Priority: P3)

**Goal**: Staff can log in, view recent photos for Cheki printing (Photos Page), and monitor system health/retry failed jobs (Admin Page).
**Independent Test**: Emulator-driven scenario for login, accessing Photos Page, and viewing Admin Page (monitoring UI).

### Tests for User Story 3 ⚠EE

- [ ] T501 [P] [US3] Add failing RTL spec `apps/photo/test/unit/app/login.test.tsx` (Login Page) validating token input, submission, and redirect (per Design Doc).
- [ ] T502 [P] [US3] Add failing RTL spec `apps/photo/test/unit/app/admin.test.tsx` (Admin Page) validating links (T503) and monitoring UI (T504) (FR-007).
- [ ] T503 [P] [US3] Add failing RTL spec `apps/photo/test/unit/app/photos.test.tsx` (Photos Page) validating real-time feed of GeneratedPhoto for printing (FR-009).

Implementation for User Story 3

- [ ] T504 [US3] Implement Login Page (`src/app/login/page.tsx`) using AuthService (Server Action) to sign in staff (per Design Doc).
- [ ] T505 [US3] Implement Admin Page (`src/app/admin/page.tsx`) with links to Control/Display/Photos (per Design Doc) and UI for monitoring errors (FR-007).
- [ ] T506 [US3] Implement Photos Page (`src/app/photos/page.tsx`) with real-time Firestore subscription to generatedPhotos (ordered by createdAt) for Cheki printing (FR-009).
- [ ] T507 [US3] Implement monitoring backend for FR-007 (Admin Page) and US3 (Aquarium sync status/retry). (Note: Requires error logging in Phase 3/4 services).

**Checkpoint**: US3 flow (Staff Login, Admin, Photos) complete.

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T601 [P] [POLISH] Implement PhotoCleaner (Firebase Function) (TDD) to delete uploadedPhotos (unused: 15min / used: immediate) (FR-006) and log to photoCleanerAudit (data-model.md).
- [ ] T602 [P] [POLISH] Author Playwright E2E `apps/photo/test/e2e/photo.spec.ts` spanning US1 (capture) ↁEUS2 (download) ↁEUS3 (login/photos), wired to Firebase Emulator.
- [ ] T603 [POLISH] Integrate logging/Sentry (`apps/photo/sentry.server.config.ts`, `src/infra/logger.ts`) ensuring errors include boothId and photoId.
- [ ] T604 [P] [POLISH] Expand i18n dictionaries `src/libs/i18n/photo.{ja,en}.ts` for all UI pages.
- [ ] T605 [POLISH] Update operations docs (`specs/002-gemini-ai-docs/quickstart.md`, `docs/spec/change-log.md`) with setup, admin login, and runbook.
- [ ] T606 [POLISH] Run `pnpm lint:fix`, `pnpm coverage --filter photo`, archive coverage artefacts, and attach results to PR template.

## Dependencies & Execution Order

- **Phase Dependencies**: Setup ↁEFoundational ↁEUser Stories (US1 can start only after Foundational). US2 and US3 depend on US1 data contracts but can proceed in parallel once US1 API surfaces stabilize.
- **Within Stories**: Tests (⚠EE precede implementation; ensure BoothService (T305) and useBoothState (T307) are implemented early in US1 as Control Page (T309) and Display Page (T308) depend heavily on them.
- **Parallel Opportunities**: Tasks marked [P] can proceed concurrently. US2 and US3 UI workstreams can run in parallel after their respective API services are stubbed.