# Tasks: Stamp Rally Web Experience

**Input**: Design documents from `/specs/001-build-a-stamp/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include Vitest and integration tasks that deliver 100% statement and branch coverage for the scope in line with the Exhaustive Testing Mandate.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `apps/stamp/src/` houses feature code, `apps/stamp/test/` holds Vitest suites, shared assets live under `packages/`

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Update festival configuration references in `docs/spec/stamp/Design Doc.md` aligning scope with latest spec
- [x] T002 Add NFC token and Google Form placeholders to `apps/stamp/.env.example`
- [x] T003 Scaffold Remote Config template with maintenance keys in `apps/stamp/config/remote-config.template.json`
- [x] T004 Create seeding script for emulator attendees in `apps/stamp/scripts/seed-attendees.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T005 Implement Firebase client factories in `apps/stamp/src/lib/firebase/client.ts`
- [x] T006 Add Remote Config service with maintenance cache in `apps/stamp/src/lib/config/remote-config.ts`
- [x] T007 Configure Sentry instrumentation per constitution in `apps/stamp/src/lib/monitoring/sentry.ts`
- [x] T008 Build SWR cache key utilities in `apps/stamp/src/lib/swr/keys.ts`
- [x] T009 Define bilingual copy dictionary in `apps/stamp/src/lib/i18n/messages.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Collect Stamps Seamlessly (Priority: P1) 🎯 MVP

**Goal**: Attendees scan NFC tags to earn stamps and see real-time progress in both languages.
**Independent Test**: use anonymous attendee to trigger each NFC token via emulator, confirm live progress and duplicate handling in `apps/stamp/test/stamp-award.test.ts`.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [x] T010 [P] [US1] Create stamp award Vitest suite in `apps/stamp/test/stamp-award.test.ts`
- [x] T011 [P] [US1] Add progress and stamp page feedback tests in `apps/stamp/test/progress-view.test.tsx` and `apps/stamp/src/app/stamp/__tests__/page.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement NFC token validation helper in `apps/stamp/src/features/stamps/server/validate-token.ts`
- [x] T013 [US1] Add Firestore award action with audit logging to `apps/stamp/src/features/stamps/server/award-stamp.ts`
- [x] T014 [P] [US1] Create SWR progress hook in `apps/stamp/src/features/stamps/hooks/useStampProgress.ts`
- [x] T015 [US1] Update home page progress UI in `apps/stamp/src/app/page.tsx`
- [x] T016 [US1] Implement stamp page animation and messaging in `apps/stamp/src/app/stamp/page.tsx`
- [x] T017 [US1] Build feedback banner component for duplicates/errors in `apps/stamp/src/features/stamps/components/stamp-feedback.tsx`
- [x] T018 [US1] Persist stamp event records in `apps/stamp/src/features/stamps/services/stamp-event-logger.ts`

**Checkpoint**: User Story 1 independently shippable with passing tests.

---

## Phase 4: User Story 2 - Complete Survey and Unlock Rewards (Priority: P2)

**Goal**: Qualified attendees submit surveys and receive unique reward QR codes.
**Independent Test**: run survey submission flow in emulator, assert eligibility and QR generation via `apps/stamp/test/survey-submit.test.ts`.

### Tests for User Story 2 ⚠️ (write first, ensure they fail)

- [x] T019 [P] [US2] Write survey proxy contract tests in `apps/stamp/test/survey-submit.test.ts`
- [x] T020 [P] [US2] Add reward eligibility unit tests in `apps/stamp/test/reward-eligibility.test.ts`

### Implementation for User Story 2

- [x] T021 [US2] Create survey submission proxy route in `apps/stamp/src/app/api/survey/route.ts`
- [x] T022 [US2] Extend attendee profile model with survey fields in `apps/stamp/src/features/profile/models/attendee-profile.ts`
- [x] T023 [US2] Implement eligibility service in `apps/stamp/src/features/rewards/server/check-eligibility.ts`
- [x] T024 [P] [US2] Build gift page with QR canvas in `apps/stamp/src/app/gift/page.tsx`
- [x] T025 [US2] Add QR canvas generator component in `apps/stamp/src/features/rewards/components/qr-canvas.tsx`
- [x] T026 [US2] Localize survey form layout in `apps/stamp/src/app/form/page.tsx`
- [x] T027 [US2] Record survey submission references in `apps/stamp/src/features/survey/server/record-submission.ts`

**Checkpoint**: User Story 2 independently shippable with passing tests and QA evidence.

---

## Phase 5: User Story 3 - Admin Verify Redemptions (Priority: P3)

**Goal**: Authorized staff scan QR codes, prevent duplicates, and log redemptions.
**Independent Test**: authenticate admin in emulator, exercise scanning and fallback logic validated by `apps/stamp/test/reward-redeem.test.ts`.

### Tests for User Story 3 ⚠️ (write first, ensure they fail)

- [ ] T028 [P] [US3] Add reward redemption API tests in `apps/stamp/test/reward-redeem.test.ts`
- [ ] T029 [P] [US3] Verify BarcodeDetector fallback UI in `apps/stamp/test/scan-fallback.test.tsx`

### Implementation for User Story 3

- [ ] T030 [US3] Implement admin auth guard utility in `apps/stamp/src/features/admin/server/require-admin.ts`
- [ ] T031 [US3] Create reward redeem API route in `apps/stamp/src/app/api/reward/redeem/route.ts`
- [ ] T032 [P] [US3] Build scan page with detector hooks in `apps/stamp/src/app/scan/page.tsx`
- [ ] T033 [US3] Add manual lookup dialog component in `apps/stamp/src/features/admin/components/manual-lookup-dialog.tsx`
- [ ] T034 [US3] Persist redemption logs in `apps/stamp/src/features/rewards/server/log-redemption.ts`
- [ ] T035 [US3] Handle maintenance bypass state in `apps/stamp/src/features/admin/hooks/useMaintenanceBypass.ts`

**Checkpoint**: User Story 3 independently shippable with passing tests and on-site validation steps.

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] T036 Update change log entries in `docs/spec/change-log.md`
- [ ] T037 Refresh quickstart verification steps in `specs/001-build-a-stamp/quickstart.md`
- [ ] T038 Capture Lighthouse and Web Vitals report in `apps/stamp/scripts/perf-report.md`
- [ ] T039 Finalize bilingual copy review notes in `apps/stamp/docs/ux-copy-checklist.md`
- [ ] T040 Harden incident response playbook references in `docs/spec/Design Doc.md`
- [ ] T041 Run coverage report export in `apps/stamp/test/coverage-summary.md`

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → precedes Foundational tasks.
- **Foundational (Phase 2)** → required before any user story work.
- **User Story 1 (P1)** → unlocks anonymously authenticated progress tracking (MVP).
- **User Story 2 (P2)** → depends on US1 completion for eligibility data.
- **User Story 3 (P3)** → depends on US2 for QR payload semantics.
- **Polish Phase** → runs after stories converge.

## Parallel Opportunities

- Setup tasks T001–T004 can run in parallel after aligning scope.
- Foundational tasks T005–T009 are parallelizable once Firebase config path is agreed.
- In US1, tasks T014 and T017 can proceed alongside UI updates after validation helper exists.
- In US2, tasks T024–T026 allow concurrent UI work while server eligibility is finalized.
- In US3, tasks T032 and T033 can be implemented concurrently once auth guard (T030) ships.

## Implementation Strategy

1. Complete Setup & Foundational tasks to solidify Firebase, Remote Config, SWR, and monitoring scaffolding.
2. Ship User Story 1 as the MVP (anonymous sign-in, NFC awarding, progress UI, bilingual messaging).
3. Layer in User Story 2 to unlock surveys and QR rewards; validate forms and QR output with festival hardware.
4. Finish with User Story 3 for admin redemption control and duplicate prevention.
5. Execute Polish phase for documentation, performance validation, coverage exports, and UX copy review before release.
