# Task Overview

## Setup & Config
- [ ] Configure environment validation in `src/config/env.ts` and initialize Firebase Admin in `src/config/firebase.ts` (see `docs/setup-config.md`).
- [ ] Implement structured Cloud Logging helper in `src/infra/logging/cloud-logger.ts` and expose logging factory (see `docs/setup-config.md`).

## Domain Layer
- [ ] Model fish entity, color value logic, and photo value object under `src/domain/fish` (see `docs/domain-layer.md`).
- [ ] Implement HSV hue extraction utilities and image blur policy as pure domain helpers (see `docs/domain-layer.md`).

## Application Layer
- [ ] Define repository and service ports in `src/application/ports.ts` (see `docs/application-layer.md`).
- [ ] Implement `add-fish-from-photo` use case orchestrating photo ingestion, blur, color extraction, and persistence (see `docs/application-layer.md`).
- [ ] Implement `list-fish` use case returning renderer-ready DTOs (see `docs/application-layer.md`).

## Infrastructure Layer
- [ ] Create Firestore repository using `FirestoreDataConverter` in `src/infra/repositories/firestore-fish-repo.ts` (see `docs/infrastructure-layer.md`).
- [ ] Create Storage adapter uploading blurred textures in `src/infra/repositories/storage-photo-store.ts` (see `docs/infrastructure-layer.md`).
- [ ] Implement `image-processor` service wrapping blur + HSV histogram logic in `src/infra/services/image-processor.ts` (see `docs/infrastructure-layer.md`).

## Controller Layer
- [ ] Build API key and error-handling middleware under `src/controller/middleware` (see `docs/controller-layer.md`).
- [ ] Implement `upload-photo` and `get-fish` handlers plus route registration in `src/controller/http` (see `docs/controller-layer.md`).

## Utilities
- [ ] Introduce `AppError` hierarchy and shared error-to-response mapping in `src/errors/` (see `docs/utilities.md`).

## Quality & Operations
- [ ] Write unit tests for domain/application/controller logic using infrastructure mocks (see `docs/quality-ops.md`).
- [ ] Add minimal integration test in `test/integration/renderer-contract.test.ts` (see `docs/quality-ops.md`).
- [ ] Document deployment runbook updates (env vars, logging expectations) in `README.md` (see `docs/quality-ops.md`).
