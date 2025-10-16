# Feature Specification: Stamp Rally Web Experience

**Feature Branch**: `001-build-a-stamp`  
**Created**: 2025-10-16  
**Status**: Draft  
**Input**: User description: "Build a stamp-rally web application based on docs/spec/Design Doc.md and docs/spec/stamp/Design Doc.md. Refer other design docs in docs/spec/ if needed."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Collect Stamps Seamlessly (Priority: P1)

Festival attendees scan NFC entry points to earn stamps and track their progress in real time.

**Why this priority**: Stamp collection is the core attendee value proposition and unlocks all downstream interactions.

**Independent Test**: Using a fresh anonymous profile, simulate each NFC trigger, observe stamp status updates on the home page, and confirm bilingual messaging.

**Acceptance Scenarios**:

1. **Given** an attendee who signs in anonymously on the home page, **When** they scan a valid NFC tag, **Then** the corresponding stamp is granted, the progress indicator updates instantly, and success messaging appears in both supported languages.
2. **Given** an attendee who already holds a specific stamp, **When** they rescan the same NFC tag, **Then** the system confirms completion without duplicating the stamp and guides them back to the home page.
3. **Given** an attendee who attempts to access an invalid or expired NFC URL, **When** the page loads, **Then** the system displays a friendly error and directs them to retry via a staff member.

---

### User Story 2 - Complete Survey and Unlock Rewards (Priority: P2)

Attendees who finish the survey after collecting all stamps can access a gift page with a redeemable QR code.

**Why this priority**: Prize fulfillment motivates survey participation and provides measurable festival feedback.

**Independent Test**: With a profile holding all stamps, submit survey responses, confirm eligibility checks, and verify QR code plus reward instructions show in both languages.

**Acceptance Scenarios**:

1. **Given** an attendee with every required stamp, **When** they open the survey page, **Then** the system pre-fills their anonymous identifier and allows them to submit feedback once.
2. **Given** an attendee who submits the survey, **When** the submission succeeds, **Then** they are redirected to the gift page where a personalized QR code and reward instructions are visible and printable.
3. **Given** an attendee who attempts to reach the gift page without all stamps or without completing the survey, **When** the page loads, **Then** they see clear guidance on the remaining steps rather than the QR code.

---

### User Story 3 - Admin Verify Redemptions (Priority: P3)

Authorized staff log into the scan page to confirm QR codes and mark prizes as redeemed.

**Why this priority**: Controlled redemption prevents duplicate prize claims and maintains inventory accuracy.

**Independent Test**: Sign in with admin credentials, scan a valid attendee QR code, and confirm the system updates redemption status with clear operator messaging.

**Acceptance Scenarios**:

1. **Given** a staff member on the scan page who has successfully authenticated, **When** they scan a QR code for an eligible attendee, **Then** the system records the redemption, shows the attendee identifier, and instructs staff to hand over the prize.
2. **Given** a staff member who scans a QR code that has already been redeemed, **When** the scan completes, **Then** the system warns that the reward was already collected and blocks duplicate fulfillment.
3. **Given** an unauthenticated user trying to access the scan page, **When** they arrive, **Then** they see a secure sign-in form and cannot open the scanner until credentials are verified.

---

### Edge Cases

- Consecutive NFC scans fail because of intermittent connectivity: attendee receives cached confirmation once connectivity resumes or is instructed to retry with staff assistance.
- Remote Config enters maintenance mode mid-session: all attendee pages redirect with multilingual maintenance messaging while the admin scan page stays accessible.
- Attendee device locale is neither Japanese nor English: system defaults to Japanese with a toggle to English.
- Admin attempts to redeem with a QR code generated more than the stated validity window: system rejects and instructs staff to reaffirm attendee identity.
- Survey submission to Google Form encounters an error: attendee sees a retry option plus alternate instructions to notify staff.

## Quality & Coverage Plan *(mandatory)*

- **Suites**: Exercise automated suites via `pnpm test`, `pnpm test:stamp`, and `pnpm coverage`, plus experience-specific integration tests covering NFC awarding, survey submission, and redemption flows.
- **Coverage Strategy**: Maintain 100% statement and branch coverage by pairing every user story with unit and integration tests; document any exclusions in the coverage report and secure Tech Lead approval.
- **Environments**: Validate against the Firebase Emulator for Auth, Firestore, Remote Config, and hosting behaviors; conduct device walkthroughs on festival kiosk hardware and representative attendee smartphones; rehearse Remote Config maintenance toggles in staging.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: The system MUST allow attendees to access the stamp rally home page via anonymous sign-in without manual account creation.
- **FR-002**: The system MUST present bilingual (Japanese and English) navigation, instructions, and status indicators across all attendee-facing pages.
- **FR-003**: The system MUST display real-time stamp progress, including which locations are completed and which remain.
- **FR-004**: The system MUST grant a specific stamp only when the attendee visits the corresponding NFC URL carrying a valid, non-expired token.
- **FR-005**: The system MUST prevent duplicate stamp awards for the same attendee and token combination.
- **FR-006**: The system MUST record the timestamp and source location of each awarded stamp for auditing.
- **FR-007**: The system MUST require completion of the attendee survey before showing the reward QR code.
- **FR-008**: The system MUST generate a unique, scannable QR code tied to the attendee’s anonymous identifier when they qualify for a reward.
- **FR-009**: The system MUST let authorized staff authenticate with email and password to access the QR scan page.
- **FR-010**: The system MUST allow staff to scan attendee QR codes, confirm eligibility, and mark the reward as redeemed.
- **FR-011**: The system MUST surface maintenance messaging controlled through Remote Config while keeping critical staff tools reachable.
- **FR-012**: The system MUST log all redemption attempts, including successful, duplicate, and invalid scans, for incident review.
- **FR-013**: The system MUST provide survey submission confirmation and graceful retry guidance if the downstream Google Form is unavailable.
- **FR-014**: The system MUST support staff-triggered reset of an attendee’s reward status when supervisors authorize a reissue.

### Key Entities *(include if feature involves data)*

- **Attendee Profile**: Represents an anonymously authenticated festival visitor; tracks stamp completion status, survey completion, QR code validity window, and redemption state.
- **Stamp Token**: Defines the mapping between an NFC entry point and the stamp it awards; includes token value, location name, activation window, and allowed retries.
- **Reward Redemption**: Captures when and by whom a reward was claimed; stores attendee identifier, QR code issuance timestamp, redemption timestamp, and staff operator id.
- **Survey Response Reference**: Links attendee completion state to the external survey record; includes attendee identifier, submission timestamp, and verification checksum.
- **Maintenance Notice**: Holds Remote Config controlled messaging for maintenance or incidents; includes status flag, headline copy, detail message, and last updated timestamp.

### Assumptions

- Festival kiosks and attendee devices maintain intermittent but recurring connectivity sufficient for short data syncs.
- Staff have access to managed devices capable of scanning QR codes in low-light indoor conditions.
- Survey feedback volume aligns with expected festival traffic (up to several thousand submissions) without requiring additional rate limiting.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 95% of attendees who collect at least one stamp complete all required stamps within 10 minutes of their first scan.
- **SC-002**: The home page and stamp awarding interactions deliver visible feedback within 2 seconds on festival kiosks during peak hours.
- **SC-003**: At least 80% of completed stamp journeys result in a submitted survey with a successfully generated reward QR code.
- **SC-004**: Staff report fewer than 2% duplicate redemption incidents, confirmed through redemption logs and on-site audit sampling.
