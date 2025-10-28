# Interactive Art Aquarium Backend Architecture

This document translates the interactive art installation design spec into a concrete coding architecture for `apps/art-backend`. It covers runtime components, layering, directory layout, request flows, infrastructure integrations, and quality practices that keep the service reliable during the three-day event.

## Runtime Overview
- **Framework:** Hono.js with edge-friendly middlewares, hosted on Cloud Run behind Firebase Hosting rewrites (`art.fes2025.gdsc-osaka.jp`).
- **Auth:** Shared `X-API-KEY` header validated against Cloud Run secrets (via environment variables).
- **Data Stores:** Firestore (fish metadata) and Firebase Storage (fish textures) accessed through Firebase Admin SDK.
- **Observability:** Google Cloud Logging with structured JSON output for traces, diagnostics, and alerting.
- **Clients:** AI photobooth (uploads) and Unity renderer (polls fish every 30s).

## Layered Architecture
All code follows DDD-inspired functional layering without classes.

| Layer | Responsibility | Direct Dependencies |
| --- | --- | --- |
| **Domain (`src/domain`)** | Pure modeling of fish entities, value objects (e.g., colors, timestamps), and domain-level operations such as `buildFishFromPhoto`. | None |
| **Application (`src/application`)** | Use cases orchestrating domain logic and repositories (e.g., `addFishFromPhoto`, `listFish`). Handles transactions. | Domain |
| **Infrastructure (`src/infra`)** | Gateways to Firestore, Storage, logging, configuration, and third-party SDK wiring. Implements repository contracts using Firebase Admin and Google clients. | Application interfaces, Firebase Admin SDK, Google Cloud Logging |
| **Controller (`src/controller`)** | HTTP adapters: request validation, API key auth middleware, response serialization, and routing. | Application use cases, Hono |
| **Config (`src/config`)** | Environment parsing, constants, and shared setup (Firebase admin initialization, logging wiring). | `env-var`, Firebase Admin SDK |

The entry point (`src/index.ts`) composes the Hono app, registers routes, and exports the handler for Cloud Run.

## Directory Layout
```
apps/art-backend/
├── ARCHITECTURE.md
├── README.md
├── src/
│   ├── index.ts                # Bootstraps Hono app, wires global middleware, exports Cloud Run handler
│   ├── config/
│   │   ├── env.ts              # Validates required environment variables (env-var)
│   │   └── firebase.ts         # Initializes Firebase Admin and registers FirestoreDataConverter instances
│   ├── domain/
│   │   └── fish/
│   │       ├── fish.ts         # Fish entity definition, invariants, zod codec, expiration policy helpers
│   │       ├── fish-color.ts   # HSV hue extraction logic distilled into pure utilities
│   │       └── photo.ts        # Photo value object handling buffer metadata and blur requirements
│   ├── application/
│   │   ├── ports.ts            # Contracts for repositories, storage, logging; consumed by use cases
│   │   ├── add-fish-from-photo.ts # Orchestrates photo ingestion, image processing, and persistence
│   │   └── list-fish.ts        # Aggregates fish read models for renderer consumption
│   ├── infra/
│   │   ├── repositories/
│   │   │   ├── firestore-fish-repo.ts   # Firestore repository satisfying FishPort contract
│   │   │   └── storage-photo-store.ts   # Firebase Storage gateway uploading blurred textures
│   │   ├── services/
│   │   │   └── image-processor.ts       # Wraps sharp/OpenCV utilities for blur + HSV histogram analysis
│   │   ├── logging/
│   │   │   └── cloud-logger.ts          # Structured logger formatting entries for Cloud Logging ingestion
│   ├── controller/
│   │   ├── http/
│   │   │   ├── routes.ts                # Central route registry mapping paths to handlers
│   │   │   ├── upload-photo.handler.ts  # Processes multipart uploads and invokes add-fish use case
│   │   │   └── get-fish.handler.ts      # Builds renderer response using list-fish use case
│   │   └── middleware/
│   │       ├── api-key.ts               # Validates X-API-KEY against env config and short-circuits on failure
│   │       └── error-handler.ts         # Translates error into HTTP responses + log severity
│   ├── errors/
│   │   ├── app-error.ts                 # Base AppError plus typed subclasses (validation, auth, infra, processing)
│   │   └── http-error-map.ts            # Helpers mapping AppError codes to HTTP status + log metadata
│   └── utils/                           # Shared pure helpers (e.g., correlation ID generation)
└── test/
    └── integration/
        └── renderer-contract.test.ts    # High-level test covering API contract with Unity renderer
```

### Naming & Code Style
- Use `const` objects/functions; avoid classes, `let`, and loops (prefer array methods or recursion).
- Type definitions via `type`/`interface` plus zod schemas for runtime validation.
- No `as` assertions; add type guards when needed.
- Firestore access always goes through `FirestoreDataConverter` to guarantee typed reads/writes.

## Request & Data Flows

### `/upload-photo` (Photobooth → Backend)
1. **API key middleware** verifies `X-API-KEY`.
2. Handler parses multipart payload, converts to domain `Photo` object (stores buffer + metadata).
3. Use case `addFishFromPhoto` orchestrates:
   - Blur entire image (privacy) and persist to Storage (`fish_images/{fishId}/fish.png`).
   - Extract hue histogram (HSV) and compute representative color.
   - Assemble `Fish` domain object with metadata (id, imageUrl, imagePath, color, createdAt).
   - Persist to Firestore via repository.
4. On success, respond `200` with created fish descriptor (id, color, imageUrl).
5. Errors mapped to HTTP: validation → `400`, storage/db → `500`.
6. Structured logs emitted with correlation IDs for downstream analysis in Cloud Logging.

### `/get-fish` (Renderer → Backend)
1. API key middleware verifies request.
2. Handler invokes `listFish` use case with optional `since` cursor (future enhancement) to support delta polling.
3. Repository queries Firestore for current fish (optionally filtered by TTL).
4. Response returns JSON array of fish DTOs (id, imageUrl, color).
5. Cache-control header (`no-store`) keeps renderer polling consistently.

## Error Handling & Logging
- Use try/catch blocks in controllers, application services, and infrastructure adapters to translate unexpected failures into typed `AppError` subclasses defined in `src/errors/app-error.ts`.
- `ValidationError`, `AuthenticationError`, `ImageProcessingError`, `StorageError`, and `RepositoryError` all extend `AppError` and carry a `code` plus optional `context` for log enrichment.
- The error-handling middleware inspects thrown `AppError` instances, looks up response metadata via `src/errors/http-error-map.ts`, and emits structured logs before serializing `{ error: code, message }`.
- Google Cloud Logging captures structured logs with `severity`, `requestId`, and contextual metadata derived from controllers.

## Configuration & Secrets
- `src/config/env.ts` reads all required env vars:
  - `API_KEY`, `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `FISH_TTL_MINUTES`, `MAX_PHOTO_SIZE_MB`.
- Use `env-var` to parse and validate; missing config fails fast on boot.
- Cloud Run uses Secret Manager for API key & credentials; local dev reads `.env` (update `.env.example` accordingly).

## API Specification
- **`POST /upload-photo`**
  - Auth: `X-API-KEY`
  - Body: `multipart/form-data` with `photo` binary field
  - Success: `200` with created fish `{ id, imageUrl, color }`
  - Errors: `400` (validation/missing photo), `500` (storage/database failure)
- **`GET /get-fish`**
  - Auth: `X-API-KEY`
  - Success: `200` with array of fish objects
  - Errors: `500` for server-side issues

## Data Model
- **Firestore `fishs/{fishId}`**
  - `imageUrl: string` – CDN/Storage URL for renderer
  - `imagePath: string` – Storage path for fetch/update/delete
  - `color: string` – Hex color derived from HSV histogram
  - `createdAt: Timestamp` – Document creation (used for TTL logic)
- **Firebase Storage `fish_images/{fishId}/fish.png`**
  - Blurred fish texture sourced from the photobooth image

## Testing Strategy
- Follow TDD with Vitest; co-locate unit tests beside implementation (e.g., `src/domain/fish/__tests__`).
- Mock infrastructure adapters when testing application or controller layers; unit tests should assert behavior without hitting Firebase.
- `apps/art-backend/test/` is reserved strictly for occasional integration tests that exercise Cloud Run HTTP surfaces end-to-end.
- Keep integration coverage lean—prefer deterministic unit tests for most logic to maintain fast feedback.
- Keep coverage above 90% (`pnpm coverage --filter art-backend`) while respecting the unit-first philosophy.

## Deployment & Operations
- CI workflow (GitHub Actions) runs `pnpm lint`, `pnpm test:art-backend`, and `pnpm build`.
- Cloud Run deployment triggered on main merges; environment variables injected via secrets.
- Monitoring: configure Google Cloud alerts on error rates and log-based metrics (`severity >= ERROR`).

## Roadmap & Open Questions
- **Delta polling:** Add `updatedAt` to fish documents and support `?since=` query to reduce payload size.
- **Renderer feedback loop:** Optionally expose `/metrics` for renderer to push health info (for future operations dashboard).
- **Privacy enhancements:** Evaluate partial face masking if photobooth blur insufficient.

This architecture keeps the codebase modular, testable, and aligned with the design doc while fitting the wider workspace practices (DDD layers, functional style, TDD, Firebase tooling).
