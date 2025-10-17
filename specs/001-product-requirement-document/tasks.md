---
description: "Task list for Stamp Rally Guest Experience implementation"
---

# Tasks: Stamp Rally Guest Experience

**Input**: Design documents from `/specs/001-product-requirement-document/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md
**Tests**: Add failing Vitest suites before implementation to satisfy the Exhaustive Testing Mandate and maintain 100% statement/branch coverage for touched modules.
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Update environment placeholders for stamp rally (survey fallback, Sentry, Firebase) in `apps/stamp/.env.local.example`
- [X] T002 Add Remote Config keys (`stamp_app_status`, localized messages, survey form URL map) to `remoteconfig.template.json`
- [X] T003 Document branch entry and NFC signage requirements in `docs/spec/change-log.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T004 Harden Firestore security rules for attendee-only stamp writes and staff redemption (`apps/stamp/firestore.rules`)
- [X] T005 Ensure typed Firebase client helpers for Auth/Firestore/Remote Config in `apps/stamp/src/firebase.ts`
- [X] T006 Seed bilingual copy map shared across guest pages in `apps/stamp/src/libs/i18n/stamp-copy.ts`
- [X] T007 Configure SWR cache keys and fallbacks for stamp progress in `apps/stamp/src/hooks/use-stamp-progress.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Festival guest collects stamps (Priority: P1) 🎯 MVP

**Goal**: Guests authenticate anonymously, claim NFC stamp tokens, and see bilingual progress updates.

**Independent Test**: Using Firebase Emulator tokens, verify a fresh guest collects all four exhibit stamps without duplication and progress persists across reloads.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [X] T008 [P] [US1] Add failing Vitest coverage for anonymous stamp collection flow in `apps/stamp/test/integration/claim-stamp.integration.test.ts`
- [X] T009 [P] [US1] Add failing Vitest coverage for duplicate token rejection in `apps/stamp/src/domain/stamp.test.ts`

### Implementation for User Story 1

- [X] T010 [US1] Define stamp domain types and result helpers in `apps/stamp/src/domain/stamp.ts`
- [X] T011 [US1] Implement Firestore stamp repository with token validation hooks in `apps/stamp/src/infra/firestore/stamp-repository.ts`
- [X] T012 [US1] Create application service for claiming stamps and refreshing progress in `apps/stamp/src/application/stamps/claim-stamp.ts`
- [ ] T013 [US1] Update Stamp Page UI to animate claims and invoke service in `apps/stamp/src/app/(guest)/stamp/[token]/page.tsx`
- [ ] T014 [US1] Update Home Page to render five-slot board with bilingual CTA states in `apps/stamp/src/app/(guest)/page.tsx`
- [ ] T015 [P] [US1] Populate localized copy constants for Home/Stamp states in `apps/stamp/src/application/i18n/messages.ts`

**Checkpoint**: User Story 1 complete—guest stamp collection is fully functional and testable.

---

## Phase 4: User Story 2 - Attendee completes survey and unlocks reward (Priority: P2)

**Goal**: Guests submit the bilingual survey and receive a unique QR voucher gated by stamp completion.

**Independent Test**: With all exhibit stamps earned, submit the survey via the server action and confirm the Gift page renders a single reusable QR code tied to the attendee.

### Tests for User Story 2 ⚠️ (write first, ensure they fail)

- [ ] T016 [P] [US2] Add failing Vitest coverage for survey unlock gating in `apps/stamp/src/app/__tests__/survey-access.test.tsx`
- [ ] T017 [P] [US2] Add failing Vitest coverage for QR issuance idempotency in `apps/stamp/src/app/__tests__/reward-qr.test.tsx`

### Implementation for User Story 2

- [ ] T018 [US2] Implement survey submission server action posting to Google Forms in `apps/stamp/src/app/(guest)/actions/submit-survey.ts`
- [ ] T019 [US2] Add survey application service to persist timestamps and unlock rewards in `apps/stamp/src/application/survey/submit-survey.ts`
- [ ] T020 [US2] Update Form Page with bilingual form controls and submit wiring in `apps/stamp/src/app/(guest)/form/page.tsx`
- [ ] T021 [US2] Update Gift Page to render QR via `qrcode.react` and show redeemed state in `apps/stamp/src/app/(guest)/gift/page.tsx`
- [ ] T022 [P] [US2] Extend reward repository for QR payload persistence in `apps/stamp/src/infra/firestore/reward-repository.ts`

**Checkpoint**: User Story 2 complete—survey + reward issuance is independently testable.

---

## Phase 5: User Story 3 - Staff validates prize redemption (Priority: P3)

**Goal**: Staff authenticate, scan guest QR codes, and mark rewards redeemed with bilingual feedback.

**Independent Test**: Log in with staff credentials, scan a valid QR to mark redemption, re-scan to assert duplicate prevention, and test invalid QR handling.

### Tests for User Story 3 ⚠️ (write first, ensure they fail)

- [ ] T023 [P] [US3] Add failing Vitest coverage for staff-only redemption access in `apps/stamp/src/app/__tests__/staff-auth.test.tsx`
- [ ] T024 [P] [US3] Add failing Vitest coverage for QR scan flows (valid/duplicate/invalid) in `apps/stamp/src/app/__tests__/scan-dialogs.test.tsx`

### Implementation for User Story 3

- [ ] T025 [US3] Implement staff auth guard leveraging custom claims in `apps/stamp/src/application/auth/require-staff.ts`
- [ ] T026 [US3] Update security rules to allow staff to set `giftReceivedAt` timestamps in `firestore.rules`
- [ ] T027 [US3] Integrate `jsqr` scanner and manual ID fallback in Scan Page UI `apps/stamp/src/app/scan/page.tsx`
- [ ] T028 [US3] Implement reward redemption application service with duplicate protection in `apps/stamp/src/application/rewards/redeem-reward.ts`
- [ ] T029 [P] [US3] Add bilingual dialog components for scan outcomes in `apps/stamp/src/app/scan/components/redemption-dialog.tsx`

**Checkpoint**: User Story 3 complete—staff redemption tooling works independently.

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] T030 Wire Sentry performance tags for new routes in `apps/stamp/src/infra/observability/sentry.ts`
- [ ] T031 Capture bilingual copy updates and evidence in `docs/spec/stamp/Design Doc.md`
- [ ] T032 Update Remote Config rollout playbook with status messaging steps in `docs/spec/change-log.md`
- [ ] T033 Verify `pnpm coverage --filter stamp` and document artifacts in `apps/stamp/test/README.md`

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2**: Environment and templates must precede security rule and shared hook work.
- **Phase 2 → Phase 3**: Stamp services rely on hardened rules and shared copy hooks.
- **Story order**: Implement sequentially (US1 → US2 → US3). Later stories depend on attendee progress and reward issuance from earlier phases.
- **Polish tasks**: Execute after all user stories reach green.

## Parallel Opportunities

- T008 and T009 can run concurrently as independent Vitest suites.
- T010, T011, and T015 touch different modules (domain, infra, i18n) and may proceed in parallel once tests exist.
- T016 and T017 run concurrently; T018–T022 follow once they fail.
- T023 and T024 can execute in parallel; T027 and T029 are UI-focused and separable.

## Implementation Strategy

1. Complete Setup (Phase 1) and Foundational (Phase 2) tasks to establish environment, security, and shared hooks.
2. Deliver MVP by finishing User Story 1 and confirming tests pass—enables basic guest stamp journey.
3. Layer User Story 2 to unlock survey submission and reward issuance, preserving independent test coverage.
4. Add User Story 3 for staff redemption controls, then address polish tasks for observability and documentation before release.
