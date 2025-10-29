# Controller Layer Implementation Plan

## Objectives
- Expose HTTP interfaces that validate requests, invoke application use cases, and translate results into responses.
- Enforce API key authentication uniformly across endpoints.
- Provide consistent error serialization and logging around each request.

## Deliverables
- `src/controller/middleware/api-key.ts`
  - Middleware that reads `X-API-KEY`, compares with config, and short-circuits with `401` if invalid.
  - Attach correlation ID (e.g., UUID) to request context for logging.
- `src/controller/middleware/error-handler.ts`
  - Capture thrown errors or rejected `ResultAsync` values.
  - Map known error types to HTTP status codes and JSON payload (`{ error: string, message: string }`).
  - Log errors using injected logger with correlation ID and route info.
- `src/controller/http/upload-photo.handler.ts`
  - Parse multipart request (use `@hono/multipart`), validate presence of `photo`.
  - Call `addFishFromPhoto` use case with extracted buffer, propagate correlation ID.
  - Return `200` JSON `{ id, imageUrl, color }`.
- `src/controller/http/get-fish.handler.ts`
  - Call `listFish` use case (optionally accept `since` query).
  - Return `200` JSON array of fish DTOs, set `Cache-Control: no-store`.
- `src/controller/http/routes.ts`
  - Compose router, apply middleware, register endpoints.
- Unit tests under `src/controller/middleware/__tests__/api-key.test.ts`, `src/controller/middleware/__tests__/error-handler.test.ts`, `src/controller/http/__tests__/upload-photo.handler.test.ts`, and `src/controller/http/__tests__/get-fish.handler.test.ts`.

## Public Interfaces
- `type MiddlewareHandler = (c: Context, next: Next) => Promise<void>`
- `type Handler = (c: Context) => Promise<Response>`
- `type UploadHandlerDeps = Readonly<{ addFishFromPhoto: (input: { photo: Photo; correlationId: string }) => ResultAsync<FishDTO, AppError>; logger: Logger; config: Config }>`
- `type GetFishHandlerDeps = Readonly<{ listFish: (input: { correlationId?: string }) => ResultAsync<FishDTO[], AppError>; logger: Logger }>`
- `type RouteDeps = Readonly<{ config: Config; logger: Logger; handlers: { uploadPhoto: Handler; getFish: Handler } }>`
- `createApiKeyMiddleware(deps: { config: Config; logger: Logger }): MiddlewareHandler` — enforces authentication and injects correlation ID.
- `createErrorHandler(deps: { logger: Logger }): MiddlewareHandler` — standardizes error responses and logging.
- `createUploadPhotoHandler(deps: UploadHandlerDeps): Handler` — returns handler `(c: Context) => Promise<Response>` producing fish DTO.
- `createGetFishHandler(deps: GetFishHandlerDeps): Handler` — returns handler `(c: Context) => Promise<Response>` returning fish array.
- `registerRoutes(app: Hono, deps: RouteDeps): void` — wires middleware and handlers into Hono instance.

## Steps
1. Implement middleware with dependency injection for config and logger.
2. Build handlers that operate on `ResultAsync` and rely on error middleware for failures.
3. Update `src/index.ts` to assemble Hono app using controllers and middleware.

## Testing
- Unit test middleware and handlers with mocked use cases and logger.
- Confirm authentication rejects missing/invalid API keys.
- Validate JSON responses and headers for both endpoints.
- Maintain project-wide coverage above 90%.
