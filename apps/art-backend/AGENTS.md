# Interactive Art Backend Guidelines

## Mission
- Serve the interactive aquarium installation by exposing a small Node.js API that the Unity renderer and photobooth rely on.
- Follow the architecture and goals captured in `docs/spec/interactive/Design Doc.md`; treat that document as the source of truth for product behavior.

## Architecture Overview
- Deploy the Hono-based API to Cloud Run and publish it through Firebase Hosting rewrites at `https://art.fes2025.gdsc-osaka.jp`.
- Keep the core components aligned with the design doc: `Photo Upload Controller`, `Fish Controller`, `Fish Service`, and a structured logger that forwards entries to Google Cloud Logging.
- Polling is deliberate: the renderer fetches updates about every 30 seconds; do not replace this with WebSockets without revisiting the spec.
- A separate Firebase Function (`Fish Refresher`) prunes stale fish from Firestore—coordinate its schedule with backend retention rules.

## Development Workflow
1. Read `ARCHITECTURE.md` to understand the high-level structure and directory layout.
2. Read `TASKS.md` and pick a pending item.
3. Open the corresponding `docs/*.md` playbook referenced by that task.
4. Implement the code and unit tests following the detailed instructions.
5. Mark the task complete in `TASKS.md` by changing `[ ]` to `[x]`, then proceed to the next item.

## API Surface
- `POST /upload-photo` accepts a multipart form with a single `photo` binary part and requires the `X-API-KEY` header. On success it stores the image in Firebase Storage, blurs faces before saving, extracts the dominant hue in HSV space, and persists the fish entry.
- `GET /get-fish` returns the list of fish records for the renderer. Responses must stay compatible with the `Fish` schema defined in the design doc.
- Propagate errors through consistent problem responses; wrap handler logic with neverthrow `ResultAsync` to centralize failure handling.

## Data Model & Storage
- Firestore collection: `fishs/{fishId}` with `imageUrl`, `imagePath`, `color` (HEX), and `createdAt`.
- Firebase Storage bucket: `fish_images/{fishId}/fish.png` holds the blurred photo texture used on the fish body.
- Always interact with Firestore through `FirestoreDataConverter` helpers to keep types in sync.

## Integrations & Processing Flow
- Photobooth uploads trigger `Fish Service.addFish`, which performs privacy blurring before upload, stores the texture, extracts hue using HSV histograms, and logs events to Cloud Logging.
- Unity renderer polls `/get-fish`, applies the returned textures, and performs flocking plus visitor attraction logic locally.
- Sentry captures renderer issues; the backend should emit structured logs for parity and make it easy to correlate requests with renderer events.

## Tech Stack & Practices
- TypeScript 5.x, Node.js runtime on Cloud Run, Hono.js routing, neverthrow for error handling, obj-err for richer error metadata, Firebase Admin SDK for Storage/Firestore, and Google Cloud Logging + Sentry for observability.
- Embrace DDD: keep domain logic in function-oriented modules, avoid classes, and model variants with discriminated unions. Consult `docs/DDD.md` for boundaries.
- Work test-first (Vitest) and maintain co-located `*.test.ts` specs; target 100% coverage and verify with `pnpm --filter art-backend coverage`.
- Run `pnpm --filter art-backend lint` (or `lint:fix`) before submitting changes to satisfy Biome.

## Domain-Driven Structure
- Mirror the layered architecture from `docs/DDD.md`: infrastructure wraps Firebase clients, application services orchestrate use cases, and domain modules encapsulate pure business rules with zero external dependencies.
- Keep domain factories and guards immutable, functional, and powered by zod schemas and branded types; surface rule violations through domain-specific error builders.
- Define repositories as interfaces in the domain layer and implement them in infrastructure with `FirestoreDataConverter` helpers so transport formats never leak inward.
- Uphold ubiquitous language by naming modules, functions, and data structures after the terms used in the interactive art design doc and on-site operator playbooks.

## TDD Workflow
- Follow the Red → Green → Refactor cadence from `docs/TDD.md`; announce the phase when collaborating and ensure every production change starts with a failing test.
- Keep tests fast and isolated by stubbing Firebase and external services; rely on Vitest and @testing-library helpers for functional boundaries.
- Ban hard-coded values: lift configuration into constants or environment variables and share canonical tokens through the domain layer.
- Maintain 100% branch and statement coverage for non-trivial modules and run `pnpm --filter art-backend test` in CI and before opening PRs.

## Engineering Principles
- **SOLID (functional flavor):** enforce single-responsibility functions, inject dependencies via higher-order functions (Dependency Inversion), and express open/closed behavior with discriminated unions instead of branching booleans.
- **KISS:** prefer straightforward data pipelines over clever abstractions; a clear composition of small pure functions beats metaprogramming.
- **DRY:** deduplicate validation, logging, and error mapping through shared helpers; centralize constants for storage paths, collection names, and error codes.
- **Security first:** treat user input (photos, headers) as untrusted, sanitize aggressively, and log through structured helpers without leaking sensitive data.
- **Observability:** ensure every use case emits correlated logs and surfaces domain errors so Cloud Logging and Sentry traces remain actionable during the exhibition.
- **DDD:** Domain layer should not depend on Application or Infrastructure; model business rules as pure functions and immutable data structures without side effects.

## Security & Operations
- Authenticate every controller with the `X-API-KEY` header that matches the configured environment value; never downgrade this requirement.
- Store secrets through environment variables and document any additions in `.env.example` and `docs/spec/change-log.md`.
- Ensure face blurring remains enabled so attendee identities are not visible on rendered fish textures.
- When adding retention logic or altering polling intervals, update both this guide and `Design Doc.md` so on-site operators stay informed.

## Open Questions & Follow-ups
- Revisit the hue extraction algorithm only if renderer requirements change; current plan is HSV-mode histogram as noted in the doc.
- Clarify and implement the `Fish Refresher` schedule to keep the aquarium lively without exhausting Firestore writes.
