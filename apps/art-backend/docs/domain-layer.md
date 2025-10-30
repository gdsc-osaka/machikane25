# Domain Layer Implementation Plan

## Objectives
- Model fish-related concepts as pure functions and immutable data structures.
- Encapsulate validation rules (e.g., color format, TTL) close to the domain.
- Provide deterministic helpers consumed by application use cases and easily testable in isolation.

## Deliverables
- `src/domain/fish/fish.ts`
  - Define `Fish` type with fields: `id`, `imageUrl`, `imagePath`, `color`, `createdAt`.
  - Provide a zod schema for runtime validation and a `createFish` constructor that throws `FishValidationError` when invariants break.
  - Include `isExpired(fish, now, ttlMinutes)` utility for TTL checks.
- `src/domain/fish/fish-color.ts`
  - Implement HSV histogram calculation over provided pixel data.
  - Return representative hue converted to hex using deterministic mapping.
  - Expose pure helpers with no side effects (no I/O libraries here—just math).
- `src/domain/fish/photo.ts`
  - Define `Photo` value object encapsulating buffer, mime type, and size safeguards.
  - Provide `validatePhoto` to ensure size <= `MAX_PHOTO_SIZE_MB`.
  - Specify privacy policy that blur must be applied before persistence (document via function contract).
- Unit tests under `src/domain/fish/__tests__/fish.test.ts`, `src/domain/fish/__tests__/fish-color.test.ts`, and `src/domain/fish/__tests__/photo.test.ts`.

## Public Interfaces
- `type Fish = Readonly<{ id: string; imageUrl: string; imagePath: string; color: string; createdAt: Date }>`
- `type FishDocument = Readonly<{ id: string; imageUrl: string; imagePath: string; color: string; createdAt: FirebaseFirestore.Timestamp }>`
- `type CreateFishInput = Readonly<{ id: string; imageUrl: string; imagePath: string; color: string; createdAt: Date }>`
- `type HSVPixel = Readonly<{ h: number; s: number; v: number }>`
- `type Photo = Readonly<{ buffer: Buffer; mimeType: string; size: number }>`
- `type PhotoMeta = Readonly<{ mimeType: string; size: number }>`
- `type PhotoLimits = Readonly<{ maxSizeBytes: number }>`
- `createFish(input: CreateFishInput): Fish` — throws `FishValidationError` if any invariant fails.
- `isExpired(args: { fish: Fish; now: Date; ttlMinutes: number }): boolean` — determines TTL expiry.
- `deriveFishColor(pixels: HSVPixel[]): string` — throws `ColorExtractionError` when hue cannot be derived.
- `createPhoto(buffer: Buffer, meta: PhotoMeta, limits: PhotoLimits): Photo` — throws `PhotoValidationError` when limits are violated.

## Error Contracts
- `createFish`
  - Throws `FishValidationError` with `code = 'FISH_INVALID'` and `context.invalidFields` when id, color, or timestamps fail validation.
- `createPhoto`
  - Throws `PhotoValidationError` with codes such as `PHOTO_TOO_LARGE` or `PHOTO_UNSUPPORTED_TYPE`.
- `deriveFishColor`
  - Throws `ColorExtractionError` with code `COLOR_EXTRACTION_FAILED` when HSV data lacks usable pixels.
- Domain helpers must only throw synchronous errors and must not catch-and-log; application services take responsibility for logging.

## Steps
1. Establish core types and zod schemas to validate domain invariants.
2. Implement color extraction logic using arrays of HSV values supplied by infra layer.
3. Create TTL logic consumed by application layer for cleanup decisions.
4. Write pure transformations (no Firebase dependencies) to keep unit tests straightforward.

## Testing
- Unit test constructors and validators with valid/invalid samples.
- Verify hue calculations using small synthetic pixel arrays.
- Ensure `isExpired` respects boundary conditions.
- Maintain project-wide coverage above 90%.
