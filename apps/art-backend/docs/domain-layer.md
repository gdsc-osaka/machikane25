# Domain Layer Implementation Plan

## Objectives
- Model fish-related concepts as pure functions and immutable data structures.
- Encapsulate validation rules (e.g., color format, TTL) close to the domain.
- Provide deterministic helpers consumed by application use cases and easily testable in isolation.

## Deliverables
- `src/domain/fish/fish.ts`
  - Define `Fish` type with fields: `id`, `imageUrl`, `imagePath`, `color`, `createdAt`.
  - Provide a zod schema for runtime validation and a `createFish` constructor returning `Result`.
  - Include `isExpired(fish, now, ttlMinutes)` utility for TTL checks.
- `src/domain/fish/fish-color.ts`
  - Implement HSV histogram calculation over provided pixel data.
  - Return representative hue converted to hex using deterministic mapping.
  - Expose pure helpers with no side effects (no I/O libraries here—just math).
- `src/domain/fish/photo.ts`
  - Define `Photo` value object encapsulating buffer, mime type, and size safeguards.
  - Provide `validatePhoto` to ensure size <= `MAX_PHOTO_SIZE_MB`.
  - Specify privacy policy that blur must be applied before persistence (document via function contract).

## Steps
1. Establish core types and zod schemas to validate domain invariants.
2. Implement color extraction logic using arrays of HSV values supplied by infra layer.
3. Create TTL logic consumed by application layer for cleanup decisions.
4. Write pure transformations (no Firebase dependencies) to keep unit tests straightforward.

## Testing
- Unit test constructors and validators with valid/invalid samples.
- Verify hue calculations using small synthetic pixel arrays.
- Ensure `isExpired` respects boundary conditions.
