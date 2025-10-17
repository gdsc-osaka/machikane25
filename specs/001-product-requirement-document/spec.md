# Feature Specification: Stamp Rally Guest Experience

**Feature Branch**: `001-product-requirement-document`  
**Created**: 2025-10-16  
**Status**: Draft  
**Input**: User description: "Product Requirement Document is already defined in docs/spec/PRD.md and docs/spec/stamp/PRD.md, so create specification based on them."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Festival guest collects stamps (Priority: P1)

The attendee arrives at Machikane Festival, taps NFC checkpoints at each exhibition, and monitors progress on their phone without creating an account.

**Why this priority**: Capturing stamps is the core reason the system exists and drives traffic across all booths.

**Independent Test**: Launch the stamp rally experience with emulator NFC inputs and confirm a participant can join anonymously, collect each required stamp, and see progress reflected immediately.

**Acceptance Scenarios**:

1. **Given** an unauthenticated attendee lands on the stamp rally URL, **When** they first tap the reception NFC tag, **Then** the system MUST provision an anonymous profile and record the first stamp.
2. **Given** an attendee has already collected a checkpoint, **When** they re-tap the same NFC tag within the festival day, **Then** the system MUST prevent duplicate credit while showing the existing progress in both Japanese and English.

---

### User Story 2 - Attendee completes survey and unlocks reward (Priority: P2)

After collecting all exhibition stamps, the attendee completes the satisfaction survey and receives a one-time QR voucher for prize redemption.

**Why this priority**: Survey participation and prize distribution measure engagement and require clear gating to avoid confusion.

**Independent Test**: With all stamps marked complete in the emulator, submit the feedback form and validate that a reward QR is issued once and remains linked to the correct attendee state.

**Acceptance Scenarios**:

1. **Given** an attendee has four exhibition stamps recorded, **When** they navigate to the survey link and submit the required answers, **Then** the system MUST register the survey completion and unlock the reward QR page.
2. **Given** an attendee already generated a reward QR, **When** they attempt to access the reward page again, **Then** the system MUST display the existing QR without issuing a second code.

---

### User Story 3 - Staff validates prize redemption (Priority: P3)

Staff authenticate into the admin console, scan attendee reward QR codes, and prevent duplicate prize handoffs.

**Why this priority**: Operational staff need reliable tooling to close the loop on the guest journey and block fraud.

**Independent Test**: Using test admin credentials, log into the console, scan an active attendee QR, and confirm the prize is marked redeemed while subsequent scans block re-issuance.

**Acceptance Scenarios**:

1. **Given** a staff member logs into the admin console, **When** they scan a valid, unredeemed QR code, **Then** the console MUST confirm redemption and update the attendee status to "exchanged" instantly.
2. **Given** a QR code already marked as redeemed, **When** staff attempt to scan it again, **Then** the system MUST surface a bilingual warning and refuse the redemption.

---

### Edge Cases

- NFC tap fails because a device lacks NFC capabilities—system MUST display alternate instructions for receiving staff assistance.
- Attendee loses connectivity mid-way through the rally—progress MUST resume when the device reconnects without data loss.
- Staff device camera cannot read a QR code due to glare—system MUST allow manual voucher ID entry.
- Multiple attendees share a device—anonymous session MUST isolate stamp progress per device profile to avoid overwriting another guest's progress.

## Quality & Coverage Plan *(mandatory)*

- **Suites**: Exercise the stamp rally automated regression suites and coverage reports to validate guest flows, reward issuance, and bilingual messaging before release.
- **Coverage Strategy**: Write failing automated tests for each user story before implementation, keep all new files within the 100% statement and branch coverage threshold, and document any temporary exclusions with tech lead approval.
- **Environments**: Use the festival sandbox environment that mirrors authentication, data storage, and operational tooling; rehearse QR scanning and outage messaging flows with production-like kiosk devices ahead of launch.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create an anonymous attendee profile on first landing without requiring manual sign-up.
- **FR-002**: System MUST register a stamp when an attendee taps an authorized NFC checkpoint and timestamp the action for audit.
- **FR-003**: System MUST prevent duplicate stamp credit for the same checkpoint within the festival period while keeping the attempt visible to the attendee.
- **FR-004**: System MUST present the attendee's stamp progress in both Japanese and English with clear iconography for completed and pending checkpoints.
- **FR-005**: System MUST unlock the festival survey only after all required exhibition stamps are collected.
- **FR-006**: System MUST record survey completion and generate a unique reward QR tied to the attendee profile immediately.
- **FR-007**: System MUST allow staff to sign into an admin console using pre-provisioned credentials and view attendee voucher status.
- **FR-008**: System MUST mark a reward voucher as redeemed once a valid QR scan (or manual entry) occurs and block further redemptions.
- **FR-009**: System MUST give operations staff a single control surface to publish maintenance or outage notices that appear for both attendees and staff within one minute of activation.
- **FR-010**: System MUST purge or anonymize personally identifiable data within 24 hours after the festival while retaining aggregate metrics for reporting.

### Key Entities *(include if feature involves data)*

- **Attendee Profile**: Anonymous festival participant record storing unique identifier, language preference, and progression state.
- **Stamp Checkpoint**: Definition of each NFC-enabled location including label, description, and associated required order (if any).
- **Stamp Progress**: Log of attendee checkpoint completions with timestamps and method of capture.
- **Survey Response**: Record of attendee satisfaction answers linked to the attendee profile and submission time.
- **Reward Voucher**: One-time QR token storing redemption status, issued timestamp, and redeemed timestamp when applicable.

## Assumptions

- Festival operations team supplies NFC hardware and signage at all four checkpoints before opening.
- The survey tool supports bilingual forms and exports results for post-event analysis within 24 hours.
- Staff devices used for QR validation have reliable network connectivity or access to a staffed Wi-Fi network.
- Remote Config values for maintenance messaging are maintained by the operations team ahead of the festival weekend.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of attendees who start the rally collect their first stamp within 60 seconds of landing on the site.
- **SC-002**: At least 70% of attendees who collect all stamps complete the survey and receive a reward voucher.
- **SC-003**: 0% of reward vouchers are redeemed more than once, as verified by admin redemption logs during the festival.
- **SC-004**: Festival satisfaction survey indicates 85% or higher positive rating for the overall stamp rally experience in both language cohorts.
