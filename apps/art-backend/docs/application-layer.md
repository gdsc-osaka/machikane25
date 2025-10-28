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
- Unit tests under `src/application/__tests__/add-fish-from-photo.test.ts` and `src/application/__tests__/list-fish.test.ts`.

## Public Interfaces
- `type FishDTO = Readonly<{ id: string; imageUrl: string; color: string }>`
- `type FishRepository = Readonly<{ save(fish: Fish): ResultAsync<void, InfraError>; list(): ResultAsync<Fish[], InfraError> }>`
- `type PhotoStorage = Readonly<{ upload(args: { id: string; buffer: Buffer; mimeType: string }): ResultAsync<{ imageUrl: string; imagePath: string }, InfraError> }>`
- `type ImageProcessor = Readonly<{ blur(buffer: Buffer): ResultAsync<Buffer, InfraError>; extractHSV(buffer: Buffer): ResultAsync<HSVPixel[], InfraError> }>`
- `type Logger = Readonly<{ info(message: string, context?: Record<string, unknown>): void; warn(message: string, context?: Record<string, unknown>): void; error(message: string, context?: Record<string, unknown>): void }>`
- `type AddFishDeps = Readonly<{ repo: FishRepository; storage: PhotoStorage; imageProcessor: ImageProcessor; config: Config; logger: Logger }>`
- `type ListFishDeps = Readonly<{ repo: FishRepository; config: Config; logger: Logger }>`
- `type AppError = ValidationError | InfraError`
- `createAddFishFromPhoto(deps: AddFishDeps): (input: { photo: Photo; correlationId: string }) => ResultAsync<FishDTO, AppError>`
- `createListFish(deps: ListFishDeps): (input: { correlationId?: string }) => ResultAsync<FishDTO[], AppError>`

## Steps
1. Define ports with explicit error types (e.g., `InfraError`, `ValidationError`).
2. Implement use case factories that receive dependencies and config, returning callable functions.
3. Wire `ResultAsync` pipeline ensuring early returns on failure.
4. Document expected error flow for controllers to translate to HTTP status codes.

## Testing
- Unit test each use case with mocks for ports (success, failure paths).
- Verify logs are invoked with expected metadata (use spy logger).
- Confirm TTL filtering logic integrates with domain `isExpired`.
- Maintain project-wide coverage above 90%.
