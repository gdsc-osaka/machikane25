# Application Layer Implementation Plan

## Objectives
- Orchestrate domain logic with infrastructure ports via functional use cases.
- Keep side-effect boundaries explicit and testable through dependency injection.
- Ensure error handling uses `ResultAsync` to propagate typed failures to controllers.

## Deliverables
- `src/application/ports.ts`
  - Define interfaces for `FishRepository`, `PhotoStorage`, `ImageProcessor`, and `Logger`.
  - Capture method signatures returning `ResultAsync` for error-safe composition.
- `src/application/add-fish-from-photo.ts`
  - Accept dependencies and config through curried factory.
  - Steps: validate photo → run blur + color extraction via `ImageProcessor` → build `Fish` domain entity → persist image to storage → persist fish to Firestore.
  - Emit log entries around each major step with correlation IDs.
- `src/application/list-fish.ts`
  - Provide function returning current fish list (optionally filter by TTL using domain helper).
  - Map results to DTO relevant for controller/renderer (id, imageUrl, color).

## Steps
1. Define ports with explicit error types (e.g., `InfraError`, `ValidationError`).
2. Implement use case factories that receive dependencies and config, returning callable functions.
3. Wire `ResultAsync` pipeline ensuring early returns on failure.
4. Document expected error flow for controllers to translate to HTTP status codes.

## Testing
- Unit test each use case with mocks for ports (success, failure paths).
- Verify logs are invoked with expected metadata (use spy logger).
- Confirm TTL filtering logic integrates with domain `isExpired`.
