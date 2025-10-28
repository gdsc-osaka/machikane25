# Utilities Implementation Plan

## Objectives
- Provide shared helper functions that keep repetitive logic out of controllers and use cases.
- Centralize neverthrow `Result` helpers and error constructors for consistent handling.

## Deliverables
- `src/utils/result.ts`
  - Define reusable error types (`ValidationError`, `InfraError`, `AuthError`).
  - Provide helper functions such as `fromPromise`, `mapError`, and wrappers for logging integration.
  - Export discriminated unions to simplify pattern matching in controllers.
- Additional helpers as needed (e.g., correlation ID generator) can live here or in a dedicated utility file referenced from controllers.

## Steps
1. Enumerate error categories used across layers and define factory functions.
2. Implement small wrappers on top of `Result`/`ResultAsync` for consistency.
3. Integrate utilities by refactoring application/controller code to rely on shared helpers.

## Testing
- Unit test utility functions to ensure error mapping and type guards behave as expected.
- Keep tests colocated under `src/utils/__tests__/result.test.ts`.
