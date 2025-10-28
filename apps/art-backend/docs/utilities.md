# Utilities Implementation Plan

## Objectives
- Provide shared helper functions that keep repetitive logic out of controllers and use cases.
- Centralize neverthrow `Result` helpers and error constructors for consistent handling.

## Deliverables
- `src/utils/result.ts`
  - Define reusable error types (`ValidationError`, `InfraError`, `AuthError`).
  - Provide helper functions such as `fromPromise`, `mapError`, and wrappers for logging integration.
  - Export discriminated unions to simplify pattern matching in controllers.
- Unit tests under `src/utils/__tests__/result.test.ts`.
- Additional helpers as needed (e.g., correlation ID generator) can live here or in a dedicated utility file referenced from controllers.

## Public Interfaces
- `type ValidationError = Readonly<{ type: 'validation'; message: string; context?: Record<string, unknown> }>`
- `type InfraError = Readonly<{ type: 'infra'; message: string; cause?: unknown }>`
- `type AuthError = Readonly<{ type: 'auth'; message: string }>`
- `createValidationError(message: string, context?: Record<string, unknown>): ValidationError`
- `createInfraError(message: string, cause?: unknown): InfraError`
- `createAuthError(message: string): AuthError`
- `wrapAsync<T>(promise: Promise<T>): ResultAsync<T, InfraError>` — bridges promises to `ResultAsync`.
- `isValidationError(error: unknown): error is ValidationError` — type guard used by controllers.

## Steps
1. Enumerate error categories used across layers and define factory functions.
2. Implement small wrappers on top of `Result`/`ResultAsync` for consistency.
3. Integrate utilities by refactoring application/controller code to rely on shared helpers.

## Testing
- Unit test utility functions to ensure error mapping and type guards behave as expected.
- Keep tests colocated under `src/utils/__tests__/result.test.ts`.
- Maintain project-wide coverage above 90%.
