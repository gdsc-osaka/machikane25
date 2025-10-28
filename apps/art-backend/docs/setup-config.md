# Setup & Config Implementation Plan

## Objectives
- Provide a single source of truth for runtime configuration and secret wiring.
- Initialize Firebase Admin SDK exactly once and expose typed handles for Firestore and Storage.
- Ensure logging and downstream layers do not depend on raw environment variable lookups.

## Deliverables
- `src/config/env.ts`
  - Use `env-var` to read required variables: `API_KEY`, `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `FISH_TTL_MINUTES`, `MAX_PHOTO_SIZE_MB`.
  - Return an immutable `Config` object exported for other layers.
  - Fail fast by throwing a `ConfigError` when validation fails; tests assert on the error instance.
- `src/config/firebase.ts`
  - Initialize Firebase Admin using credentials resolved from config.
  - Export Firestore and Storage handles plus typed `FirestoreDataConverter` for fish entities.
- `src/infra/logging/cloud-logger.ts`
  - Factory that accepts config + request context and yields functions for structured logging (`info`, `warn`, `error`).
  - Emit JSON adhering to Google Cloud Logging expectations (`severity`, `message`, `context`).
- Unit tests under `src/config/__tests__/env.test.ts`, `src/config/__tests__/firebase.test.ts`, and `src/infra/logging/__tests__/cloud-logger.test.ts`.

## Public Interfaces
- `type Config = Readonly<{ apiKey: string; firebaseProjectId: string; credentialsPath: string; fishTtlMinutes: number; maxPhotoSizeMb: number }>`
- `type Logger = Readonly<{ info: LogFn; warn: LogFn; error: LogFn }>` where `type LogFn = (message: string, context?: Record<string, unknown>) => void`.
- `buildConfig(): Config` — reads environment variables, validates them, and returns typed configuration.
- `getFirebaseServices(config: Config): { firestore: FirebaseFirestore.Firestore; storage: admin.storage.Storage; converters: { fish: FirebaseFirestore.FirestoreDataConverter<FishDocument> } }` — initializes Firebase Admin and exposes typed handles.
- `createLogger(deps: { config: Config; requestId?: string }): Logger` — returns logging functions with signature `(message: string, context?: Record<string, unknown>) => void`.

## Error Contracts
- `buildConfig` throws `ConfigError` (extends `AppError`) when required variables are missing or fail validation; the error includes a `context` object listing offending keys.
- `getFirebaseServices` throws `FirebaseInitializationError` when Admin SDK bootstrap fails (bad credentials, missing project); the application layer catches and rethrows as `InfrastructureError` when appropriate.
- `createLogger` should never throw; defensive guards log-and-continue using `console` fallback if structured logging setup fails during initialization.

## Steps
1. Define `Config` type and builder in `env.ts`; write unit tests using temporary env overrides.
2. Bootstrap Firebase admin app with singleton pattern; guard against duplicate initialization in tests.
3. Create logging helper with typed payloads; include correlation ID hook for controllers.
4. Update `src/index.ts` to import config, firebase admin, and logger factory.

## Testing
- Unit test `env.ts` for missing/invalid variables.
- Stub Firebase admin in tests to avoid using real credentials.
- Verify logger outputs structured objects by spying on `console.log`.
- Maintain project-wide coverage above 90%.
