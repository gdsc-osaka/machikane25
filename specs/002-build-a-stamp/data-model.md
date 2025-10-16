# Data Model

## Participant (`participants/{uid}`)
- **Fields**
  - `uid` (string, document id): Firebase Auth UID; immutable.
  - `createdAt` (Timestamp): Server timestamp when the anonymous session is first created; required.
  - `lastSignedInAt` (Timestamp): Last time the participant accessed any checkpoint; required, updates on every auth refresh.
  - `stamps` (map<string, StampProgress>): Keys limited to `reception`, `photobooth`, `art`, `robot`, `survey`.
  - `survey` (SurveyState): Embedded survey status and responses.
  - `redemption` (RedemptionState): Prize eligibility + fulfillment tracking.
  - `qrCode` (string, optional): Stable, randomly generated redemption code encoded into QR (may mirror `uid` hashed with salt).
- **Relationships**
  - One-to-many with `participants/{uid}/photoboothUploads`.
  - One-to-many with `participants/{uid}/redemptionEvents`.
- **Validation Rules**
  - `stamps[*].collectedAt` is a server timestamp and may only be set once per checkpoint.
  - Survey ratings must be integers 1–5; comments limited to 500 characters.
  - `redemption.status` transitions only via defined state machine (see below).

## StampProgress
- **Fields**
  - `collectedAt` (Timestamp): When the stamp was awarded; required.
  - `tokenId` (string): Identifier of the NFC token used; required for audit.
- **Relationships**: Embedded inside `Participant`.
- **Validation Rules**
  - `tokenId` must match a configured token for the checkpoint.
  - Additional writes after initial set are rejected via rules (prevent duplicate stamps).

## SurveyState
- **Fields**
  - `status` (`'not_started' | 'in_progress' | 'submitted'`): Current lifecycle; defaults to `not_started`.
  - `submittedAt` (Timestamp, optional): Server timestamp when Google Form submission succeeded.
  - `ratings` (object): `{ photoBooth: number; interactiveArt: number; stampRally: number }`; integers 1–5 when status is `submitted`.
  - `comment` (string, optional): Free-text feedback, max 500 chars.
  - `submissionId` (string, optional): UUID stored locally and sent to Google Form hidden field.
- **Relationships**: Embedded inside `Participant`.
- **Validation Rules**
  - When `status === 'submitted'`, `ratings` and `submittedAt` must be present.
  - When `status !== 'submitted'`, ratings/comment must be undefined to avoid partial persistence.

## RedemptionState
- **Fields**
  - `status` (`'locked' | 'eligible' | 'redeemed'`): Derived from stamps + survey; transitions sequentially.
  - `eligibleAt` (Timestamp, optional): First time all stamps plus survey complete.
  - `redeemedAt` (Timestamp, optional): When staff fulfilled the prize.
  - `staffUserId` (string, optional): Firebase UID of the administrator who confirmed redemption.
- **Relationships**: Embedded inside `Participant`; audit trail stored in `redemptionEvents`.
- **Validation Rules**
  - `status` can only move forward (locked → eligible → redeemed).
  - `redeemedAt` and `staffUserId` required once status equals `redeemed`.

## Photobooth Upload (`participants/{uid}/photoboothUploads/{uploadId}`)
- **Fields**
  - `uploadId` (string, document id): UUID generated client-side.
  - `boothId` (string): Identifier from NFC link; required.
  - `status` (`'pending' | 'success' | 'failed'`): Upload lifecycle.
  - `createdAt` (Timestamp): Request initiation time.
  - `updatedAt` (Timestamp): Last status change.
  - `fileName` (string): Original file name; optional for debugging.
  - `fileSize` (number): Size in bytes; max 20 MB.
  - `errorCode` (string, optional): Failure reason mirrored from photobooth API.
- **Relationships**
  - Belongs to exactly one participant.
  - Optional link to external photobooth asset via `uploadResultId`.
- **Validation Rules**
  - `fileSize` must be <= 20_000_000.
  - Status transitions follow pending → success/failed; cannot revert.

## Redemption Event (`participants/{uid}/redemptionEvents/{eventId}`)
- **Fields**
  - `eventId` (string, document id): UUID per scan.
  - `type` (`'scan' | 'confirm' | 'duplicate'`): Event type.
  - `timestamp` (Timestamp): When the event occurred.
  - `staffUserId` (string): Authenticated admin caller.
  - `notes` (string, optional): Additional operator notes.
- **Relationships**
  - Child of participant; chronological log for auditing.
- **Validation Rules**
  - `type === 'confirm'` allowed only once; duplicates must record `duplicate`.

## State Transitions
- **Participant Lifecycle**
  1. **Created**: Anonymous user hits first checkpoint → participant doc created with `status.locked`.
  2. **Progressing**: Each token claims writes to `stamps[token]` with timestamp.
  3. **Survey Submitted**: Survey server action posts to Google Form and updates `survey.status = 'submitted'`.
  4. **Eligible**: System computes all stamps present + survey submitted → set `redemption.status = 'eligible'` and `eligibleAt`.
  5. **Redeemed**: Admin scan confirms prize → set `redemption.status = 'redeemed'`, `redeemedAt`, `staffUserId`, and append redemption event.
- **Photobooth Upload**
  - Client creates upload doc with `status: 'pending'`.
  - Server action streams file; on success sets `status: 'success'`, records `uploadResultId`; on error sets `status: 'failed'` + `errorCode`.
- **Survey Submission**
  - Form validation runs client-side via zod; server action posts to Google Form.
  - On success, `survey.status` becomes `submitted` and `stamps.survey` receives timestamp.
  - On failure, `survey.status` remains `in_progress` and error surfaces to user; no partial Firestore writes.
