# Research Findings — Stamp Rally Guest Experience

## 1. Survey Submission Without Custom APIs
- **Decision**: Invoke the Google Forms `formResponse` endpoint through a Next.js server action that stores the form URL and entry IDs on the server, returning only success/failure to the client.
- **Rationale**: The design doc forbids custom backend APIs but allows server actions for secret-bound integrations. A server action shields the Google Form metadata, keeps the UX within the App Router, and still avoids maintaining standalone endpoints.
- **Alternatives considered**:
  - **Direct client-side POST**: Exposes entry IDs and risks tampering; rejected due to confidentiality of survey schema.
  - **Firebase Cloud Function proxy**: Violates the “no backend API” rule and introduces extra deployment surfaces.

## 2. Stamp Claim Integrity Using Firebase Security Rules
- **Decision**: Perform stamp claims directly from the client via the Firebase Firestore SDK while enforcing token validation in security rules using hashed tokens stored in Remote Config and mirrored in the attendee document.
- **Rationale**: Keeps logic client-side as required, leverages security rules for trust, and ensures tokens cannot be replayed for multiple attendees because rules compare hashed values and use `exists()` checks to block duplicates.
- **Alternatives considered**:
  - **Callable Functions**: Provide stronger server guarantees but contradict the “never create backend API” directive.
  - **Plain client writes without rule checks**: Simplifies implementation but makes it trivial to spoof stamps.

-## 3. Reward Redemption by Staff with Elevated Claims
- **Decision**: Use Firebase Auth custom claims (`isStaff`) issued ahead of the event and security rules that allow only staff identities to update `rewardStatus` fields; QR scanning logic runs client-side using `jsqr`.
- **Rationale**: Meets the no-backend constraint, keeps privilege enforcement declarative in security rules, and still allows real-time redemption updates.
- **Alternatives considered**:
  - **Admin SDK via Cloud Function**: Provides a central audit log but adds backend surface area.
  - **Manual spreadsheet reconciliation**: Avoids technical work but fails the real-time redemption requirement.

## 4. Firestore Schema for Anonymous Guests
- **Decision**: Store attendee profiles under `attendees/{uid}` with subcollections for `stamps` and `survey`, plus a companion `rewards/{uid}` mirror for staff-friendly queries.
- **Rationale**: Mirrors best practices for Firebase hierarchical data, minimizes document contention, and keeps staff reads efficient without server code.
- **Alternatives considered**:
  - **Single flat `stamps` collection**: Harder to secure per user and inflates query costs.
  - **Embed survey answers in reward document**: Couples unrelated lifecycles and complicates deletions.
