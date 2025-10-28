# Task Overview

## Setup & Config
- [ ] Configure environment validation in `src/config/env.ts` and initialize Firebase Admin in `src/config/firebase.ts`.
- [ ] Implement structured Cloud Logging helper in `src/infra/logging/cloud-logger.ts` and expose logging factory.

## Domain Layer
- [ ] Model fish entity, color value logic, and photo value object under `src/domain/fish`.
- [ ] Implement HSV hue extraction utilities and image blur policy as pure domain helpers.

## Application Layer
- [ ] Define repository and service ports in `src/application/ports.ts`.
- [ ] Implement `add-fish-from-photo` use case orchestrating photo ingestion, blur, color extraction, and persistence.
- [ ] Implement `list-fish` use case returning renderer-ready DTOs.

## Infrastructure Layer
- [ ] Create Firestore repository using `FirestoreDataConverter` in `src/infra/repositories/firestore-fish-repo.ts`.
- [ ] Create Storage adapter uploading blurred textures in `src/infra/repositories/storage-photo-store.ts`.
- [ ] Implement `image-processor` service wrapping blur + HSV histogram logic in `src/infra/services/image-processor.ts`.

## Controller Layer
- [ ] Build API key and error-handling middleware under `src/controller/middleware`.
- [ ] Implement `upload-photo` and `get-fish` handlers plus route registration in `src/controller/http`.

## Utilities
- [ ] Add neverthrow result helpers and error mapping in `src/utils/result.ts`.

## Quality & Operations
- [ ] Write unit tests for domain/application/controller logic using infrastructure mocks.
- [ ] Add minimal integration test in `test/integration/renderer-contract.test.ts`.
- [ ] Document deployment runbook updates (env vars, logging expectations) in `README.md`.
