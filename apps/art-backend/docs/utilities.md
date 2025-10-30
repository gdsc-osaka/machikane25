# Utilities Implementation Plan

## Objectives
- Provide shared helper functions that keep repetitive logic out of controllers and use cases.
- Replace the previous `neverthrow`-based pipeline with typed error classes and try/catch handling.
- Give controllers a single source of truth for converting thrown errors into HTTP responses and structured logs.

## Deliverables
- `src/errors/app-error.ts`
  - Declare `AppError` base class with `code`, `message`, optional `context`, and `status` helpers.
  - Export concrete subclasses used across the codebase.
- `src/errors/factories.ts`
  - Provide factory functions `createFishValidationError`, `createImageProcessingError`, etc., to enforce consistent error construction.
- `src/errors/http-error-map.ts`
  - Map each `AppError` subclass to `{ status: number; severity: LogSeverity }` for the controller middleware.
- `src/errors/index.ts`
  - Barrel exports for convenience in tests and consumers.
- Unit tests under `src/errors/__tests__/app-error.test.ts` covering class inheritance, metadata, and mapping helpers.
- Keep additional utilities (e.g., correlation ID generation) under `src/utils/` while avoiding implicit error wrapping.

## Error Class Catalogue
- `class AppError extends Error` (abstract)  
  - Base class that standardizes `code`, `message`, and optional `context`.
- `class ConfigError extends AppError`  
  - Thrown by `buildConfig` when environment validation fails (see `docs/setup-config.md`).
- `class FirebaseInitializationError extends AppError`  
  - Thrown by `getFirebaseServices` when Firebase Admin bootstrap fails.
- `class AuthenticationError extends AppError`  
  - Thrown by `createApiKeyMiddleware` when the `X-API-KEY` header is missing or invalid.
- `class ValidationError extends AppError`  
  - Parent for domain validation issues; carries `context` about invalid properties.
- `class FishValidationError extends ValidationError`  
  - Thrown by `createFish` when entity invariants are violated.
- `class PhotoValidationError extends ValidationError`  
  - Thrown by `createPhoto` on MIME/size violations.
- `class ColorExtractionError extends AppError`  
  - Thrown by `deriveFishColor` when HSV data cannot produce a representative color.
- `class ImageProcessingError extends AppError`  
  - Thrown by `ImageProcessor.blur` / `ImageProcessor.extractHSV` when native libraries fail.
- `class StorageError extends AppError`  
  - Thrown by `createStoragePhotoStore.upload` on Firebase Storage failures.
- `class RepositoryError extends AppError`  
  - Thrown by `createFirestoreFishRepository.save` / `list` on Firestore issues.
- `class UseCaseError extends AppError`  
  - Thrown by `createAddFishFromPhoto` and `createListFish` when dependencies bubble up errors that need higher-level context.

Each subclass should set a unique `code` (e.g., `CONFIG_INVALID_ENV`, `PHOTO_TOO_LARGE`) so the error middleware can log precise diagnoses.

## Usage Guidelines
1. Wrap external SDK calls (Firebase, sharp, multipart parsing) in try/catch blocks that rethrow the appropriate `AppError` subclass with contextual metadata.
2. Domain functions perform synchronous validation and throw the relevant `ValidationError` derivative; application services catch these to attach correlation IDs before rethrowing.
3. Controller handlers rely on the shared error middleware to translate `AppError` derivatives into HTTP responses. Unexpected errors are rethrown as `UseCaseError` with `code = 'UNEXPECTED'`.

## Testing
- Unit test error factories to confirm they create the right subclass and include context.
- Assert that `http-error-map` resolves codes to the expected HTTP status and severity.
- Provide regression tests ensuring unknown errors default to `500` and `ERROR` severity.
- Keep tests colocated under `src/errors/__tests__/`.
