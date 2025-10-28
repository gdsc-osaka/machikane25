# Setup & Config Implementation Plan

## Objectives
- Provide a single source of truth for runtime configuration and secret wiring.
- Initialize Firebase Admin SDK exactly once and expose typed handles for Firestore and Storage.
- Ensure logging and downstream layers do not depend on raw environment variable lookups.

## Deliverables
- `src/config/env.ts`
  - Use `env-var` to read required variables: `API_KEY`, `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `FISH_TTL_MINUTES`, `MAX_PHOTO_SIZE_MB`.
  - Return an immutable `Config` object exported for other layers.
  - Fail fast (throw) if validation fails; wrap in `Result` if necessary for tests.
- `src/config/firebase.ts`
  - Initialize Firebase Admin using credentials resolved from config.
  - Export Firestore and Storage handles plus typed `FirestoreDataConverter` for fish entities.
- `src/infra/logging/cloud-logger.ts`
  - Factory that accepts config + request context and yields functions for structured logging (`info`, `warn`, `error`).
  - Emit JSON adhering to Google Cloud Logging expectations (`severity`, `message`, `context`).

## Steps
1. Define `Config` type and builder in `env.ts`; write unit tests using temporary env overrides.
2. Bootstrap Firebase admin app with singleton pattern; guard against duplicate initialization in tests.
3. Create logging helper with typed payloads; include correlation ID hook for controllers.
4. Update `src/index.ts` to import config, firebase admin, and logger factory.

## Testing
- Unit test `env.ts` for missing/invalid variables.
- Stub Firebase admin in tests to avoid using real credentials.
- Verify logger outputs structured objects by spying on `console.log`.
