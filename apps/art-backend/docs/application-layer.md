# Application Layer Implementation Plan

## Objectives
- Orchestrate domain logic with infrastructure ports via functional use cases.
- Keep side-effect boundaries explicit and testable through dependency injection.
- Ensure try/catch blocks wrap failures in `AppError` subclasses so controllers receive typed exceptions.

## Deliverables
- `src/application/ports.ts`
  - Define interfaces for `FishRepository`, `PhotoStorage`, `ImageProcessor`, and `Logger`.
  - Methods return `Promise` instances and declare which `AppError` subclasses they may throw.
- `src/application/add-fish-from-photo.ts`
  - Accept dependencies and config through curried factory.
  - Steps: validate photo → run blur + color extraction via `ImageProcessor` → build `Fish` domain entity → persist image to storage → persist fish to Firestore.
  - Emit log entries around each major step with correlation IDs and wrap dependency failures in typed errors.
- `src/application/list-fish.ts`
  - Provide function returning current fish list (optionally filter by TTL using domain helper).
  - Map results to DTO relevant for controller/renderer (id, imageUrl, color).
- Unit tests under `src/application/__tests__/add-fish-from-photo.test.ts` and `src/application/__tests__/list-fish.test.ts`.

## Public Interfaces
- `type FishDTO = Readonly<{ id: string; imageUrl: string; color: string }>`
- `type FishRepository = Readonly<{ save(fish: Fish): Promise<void>; list(): Promise<Fish[]> }>` — implementations throw `RepositoryError` on Firestore failures.
- `type PhotoStorage = Readonly<{ upload(args: { id: string; buffer: Buffer; mimeType: string }): Promise<{ imageUrl: string; imagePath: string }> }>` — implementations throw `StorageError`.
- `type ImageProcessor = Readonly<{ blur(buffer: Buffer): Promise<Buffer>; extractHSV(buffer: Buffer): Promise<HSVPixel[]> }>` — implementations throw `ImageProcessingError`.
- `type Logger = Readonly<{ info(message: string, context?: Record<string, unknown>): void; warn(message: string, context?: Record<string, unknown>): void; error(message: string, context?: Record<string, unknown>): void }>`
- `type AddFishDeps = Readonly<{ repo: FishRepository; storage: PhotoStorage; imageProcessor: ImageProcessor; config: Config; logger: Logger }>`
- `type ListFishDeps = Readonly<{ repo: FishRepository; config: Config; logger: Logger }>`
- `createAddFishFromPhoto(deps: AddFishDeps): (input: { photo: Photo; correlationId: string }) => Promise<FishDTO>` — throws typed `AppError` subclasses on failure.
- `createListFish(deps: ListFishDeps): (input: { correlationId?: string }) => Promise<FishDTO[]>` — throws typed `AppError` subclasses on failure.

## Error Contracts
- `createAddFishFromPhoto`
  - Throws `PhotoValidationError` when the incoming photo violates size/MIME rules.
  - Throws `ImageProcessingError` when blur or HSV extraction fails.
  - Throws `ColorExtractionError` when domain color derivation cannot resolve a hue.
  - Throws `FishValidationError` if the constructed entity fails domain invariants.
  - Wraps unexpected dependency failures in `UseCaseError` with code `ADD_FISH_UNEXPECTED`.
- `createListFish`
  - Throws `RepositoryError` if listing fish from Firestore fails.
  - Throws `UseCaseError` with code `LIST_FISH_UNEXPECTED` when unclassified exceptions bubble up.
- Application ports (`FishRepository`, `PhotoStorage`, `ImageProcessor`) must document the same throws contracts so consumers can rely on TypeScript `@throws` JSDoc annotations for clarity.

## Steps
1. Define ports with explicit throws documentation referencing `AppError` subclasses (e.g., `RepositoryError`, `StorageError`, `ValidationError`).
2. Implement use case factories that receive dependencies and config, returning callable functions.
3. Surround dependency calls with try/catch and rethrow as typed `AppError` subclasses so errors remain consistent.
4. Document expected error flow for controllers to translate to HTTP status codes.

## Testing
- Unit test each use case with mocks for ports (success, failure paths).
- Verify logs are invoked with expected metadata (use spy logger).
- Confirm TTL filtering logic integrates with domain `isExpired`.
- Assert that failure scenarios throw the correct `AppError` subclass and include correlation IDs in `context`.
- Maintain project-wide coverage above 90%.
