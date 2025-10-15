# Feature Specification: Stamp Rally Web Application

**Feature Branch**: `002-build-a-stamp`  
**Created**: 2025-10-16  
**Status**: Draft  
**Input**: User description: "Build a stamp rally web application. All feattures and specifications are defined in docs/spec/stamp/Design Doc.md and docs/spec/Design Doc.md. Refer other design doc files in docs/spec if needed."

## Assumptions
- The rally spans five checkpoints (reception, AI photobooth, interactive art exhibit, robot exhibit, post-visit survey), each exposed through a unique NFC tag or equivalent URL visitors can access on personal devices.
- Visitors have network connectivity on modern mobile browsers; handling of fully offline usage is out of scope.
- Prize inventory is managed manually by staff; the system governs eligibility, digital proof, and redemption status only.
- Survey responses must reach the organizing committee’s existing Google Form repository; the application handles packaging participant data for that submission.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Join the Rally and Earn Stamps (Priority: P1)

Attendees who tap a rally touchpoint should seamlessly join the event and see the earned stamp without prior registration.

**Why this priority**: A frictionless first stamp is essential to drive participation and guarantees that every later interaction ties back to a visitor profile.

**Independent Test**: Simulate a new visitor following a valid checkpoint link, confirm the profile is created, the correct stamp is issued once, and the update persists on refresh.

**Acceptance Scenarios**:

1. **Given** a first-time attendee opens a valid checkpoint link, **When** the page loads, **Then** a new participant profile is created, the corresponding stamp is awarded, and the attendee sees their progress summary.
2. **Given** an attendee has already collected the reception stamp, **When** they re-scan the reception tag, **Then** the system confirms the stamp is already owned and the total number of stamps does not increase.

---

### User Story 2 - Track Progress and Complete Survey (Priority: P1)

Participants must be able to review which stamps they hold and submit the satisfaction survey required to finish the rally.

**Why this priority**: Clear progress tracking and survey capture unlock the prize experience and provide the feedback the festival needs.

**Independent Test**: Seed a participant with partial progress, verify the home view summarises completed/missing checkpoints, launch the survey, submit required ratings, and ensure completion is reflected instantly.

**Acceptance Scenarios**:

1. **Given** a participant has collected at least one stamp, **When** they open the home view, **Then** they see each checkpoint’s collected or missing state along with guidance for what to do next.
2. **Given** a participant has not yet answered the satisfaction survey, **When** they choose the “answer survey” action, **Then** the survey form presents required rating fields for each installation plus an optional comment, and submission marks the survey complete on their profile.

---

### User Story 3 - Unlock Prize Redemption (Priority: P2)

Visitors who finish collecting stamps and submit the survey should access a prize page with a scannable proof of completion.

**Why this priority**: A compelling reward closes the loop on the rally journey and motivates full participation.

**Independent Test**: Configure a participant with all stamps and survey completion, open the gift page, confirm it displays an individualized QR code and readiness message, and verify it remains locked for incomplete profiles.

**Acceptance Scenarios**:

1. **Given** a participant has every stamp and a recorded survey, **When** they open the gift page, **Then** the page displays an individualized QR code and instructions for redeeming the prize.
2. **Given** a participant is missing any stamp or the survey, **When** they try to open the gift page, **Then** the system explains what remains and does not show a redemption code.

---

### User Story 4 - Admin Confirms Prize Fulfillment (Priority: P2)

Staff need a secure way to mark prizes as fulfilled when scanning a visitor’s code.

**Why this priority**: Controlled redemption prevents duplicate prize claims and keeps inventory accurate.

**Independent Test**: Attempt to access the scan experience without signing in, ensure access is blocked, authenticate with valid staff credentials, scan a ready participant code, and confirm the redemption status updates and blocks repeat scans.

**Acceptance Scenarios**:

1. **Given** a staff member is not authenticated, **When** they attempt to open the scan experience, **Then** they must provide valid administrator credentials before scanning is available.
2. **Given** a staff member is signed in and scans a valid code for an unredeemed participant, **When** they confirm the action, **Then** the participant’s record is marked redeemed and later scans show that the prize has already been collected.

---

### User Story 5 - Upload AI Photobooth Image (Priority: P3)

Photobooth visitors should be able to upload their image through the rally flow and continue gathering stamps.

**Why this priority**: Linking the photobooth upload keeps the rally integrated with the broader event experience and collects the required content for that installation.

**Independent Test**: From a photobooth link, select a local image, submit it, receive a success confirmation with next-step options, and validate that a failed upload surfaces a retry path without affecting stamps.

**Acceptance Scenarios**:

1. **Given** a participant opens the photobooth upload page with a valid booth identifier, **When** they select an eligible file and submit, **Then** the system acknowledges the upload and shows options to continue the rally.
2. **Given** an upload attempt cannot be completed, **When** the error occurs, **Then** the participant sees a clear message describing the issue and how to retry without losing progress.

---

### Edge Cases

- Multiple visitors trigger the same NFC tag simultaneously; only the intended visitor receives the stamp and others see an informative message.
- A visitor loses connectivity mid-stamp; the system retries gracefully or instructs them to reopen the link without duplicating rewards.
- A participant attempts to open the gift page before meeting the completion criteria; the page explains remaining steps instead of presenting a code.
- A QR code screenshot is presented after redemption; the system rejects the attempt and surfaces the original redemption timestamp.
- Staff enter incorrect credentials or lose access during the event; access remains denied until valid credentials are provided and sessions can be revoked.
- Maintenance mode is activated during the festival; visitor routes redirect to the maintenance notice while the admin scan tool stays available for prize handoff.

## Quality & Coverage Plan *(mandatory)*

- **Suites**: `pnpm test:stamp` for module-level coverage of rally flows, `pnpm test` to guard against monorepo regressions, and `pnpm coverage` before release to confirm 100% thresholds remain met.
- **Coverage Strategy**: Author unit and integration specs that exercise profile creation, token validation, duplicate-prevention, survey gating, QR generation, admin redemption, and maintenance toggles; document any intentionally excluded configuration stubs with justification.
- **Environments**: Run the authentication and data emulator suite for rally scenarios, verify QR scanning on representative mobile devices, and stage a maintenance-mode rehearsal before festival day.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically create a unique participant profile the first time an attendee accesses any rally checkpoint link and persist it for subsequent visits.
- **FR-002**: System MUST associate each checkpoint (reception, AI photobooth, interactive art, robot exhibit, survey completion) with a secure token and award the matching stamp only when that token is presented.
- **FR-003**: System MUST prevent duplicate stamps for a checkpoint while communicating to the participant that the stamp is already collected.
- **FR-004**: System MUST display a real-time progress view indicating collected versus remaining checkpoints and guidance for the next action.
- **FR-005**: System MUST capture a satisfaction survey containing ratings for the AI photobooth, interactive art exhibit, and stamp rally plus an optional free-text comment, and flag the participant as surveyed upon submission.
- **FR-006**: System MUST require a completed survey before marking the rally finished for any participant.
- **FR-007**: System MUST unlock the gift page exclusively for participants with every stamp and a recorded survey completion.
- **FR-008**: Gift page MUST present a participant-specific redemption code in QR format along with instructions for prize collection.
- **FR-009**: System MUST persist prize redemption status immediately when staff confirm fulfillment and prevent additional redemptions for the same participant.
- **FR-010**: Staff-facing scan experience MUST require successful administrator authentication before any redemption action can be taken.
- **FR-011**: System MUST allow participants to upload an image through the photobooth flow, confirm success, and surface actionable guidance on failure.
- **FR-012**: System MUST let participants resume their rally progress across sessions by restoring stamps, survey state, and eligibility from their profile.
- **FR-013**: System MUST present a maintenance notice and block visitor-facing rally actions (except the survey response already completed) whenever festival operations toggle maintenance mode, while leaving the admin scan experience available.
- **FR-014**: System MUST record timestamped activity logs for stamp awards, survey submissions, and prize redemptions that authorized staff can review after the event.

### Key Entities *(include if feature involves data)*

- **Participant Profile**: Represents an attendee with a unique identifier, collected stamp statuses, survey completion flag, and prize redemption outcome.
- **Stamp Checkpoint**: Defines a rally location with its label, associated secure token, awarding rules, and display order.
- **Survey Submission**: Captures participant ratings for each installation, optional comments, and the submission timestamp while linking back to the participant profile.
- **Prize Redemption Record**: Stores the participant identifier, redemption timestamp, fulfilling staff identifier, and current eligibility status.
- **Photobooth Upload Session**: Tracks the booth identifier, submitted file metadata, upload outcome, and relation to the participant profile.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of first-time visitors collect their initial stamp and see their progress summary within 30 seconds of scanning a rally touchpoint.
- **SC-002**: At least 80% of participants who collect one stamp go on to collect all five by the end of the event day.
- **SC-003**: 90% of visitors who reach the gift page complete redemption on their first scan without staff performing manual lookup or overrides.
- **SC-004**: 90% of submitted surveys contain responses for every required rating question and are stored alongside the participant profile for post-event analysis.
