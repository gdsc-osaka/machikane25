# Quality & Operations Implementation Plan

## Objectives
- Maintain high developer confidence through fast unit tests and targeted integration coverage.
- Document operational expectations for deployments, monitoring, and incident response.

## Deliverables
- Testing
  - Add unit tests alongside implementation files (`__tests__` folders) covering domain, application, controller logic.
  - Create mocks for infrastructure ports to enable deterministic tests.
  - Maintain single integration test `test/integration/renderer-contract.test.ts` hitting HTTP surface with in-memory adapters.
  - Unit test helpers under `test/utils/__tests__` if reusable mocks are created.
- Coverage & Tooling
  - Ensure Vitest config includes path aliases if introduced.
  - Update `pnpm test:art-backend` script if differentiation from workspace default is required.
- Documentation
  - Extend `README.md` with setup instructions, env variable table, and logging expectations.
  - Note deployment steps (Cloud Run + Firebase Hosting rewrite) and how logs surface in Google Cloud.

## Public Interfaces
- `type MockLogger = Readonly<{ info: vi.Mock; warn: vi.Mock; error: vi.Mock }>`
- `createMockLogger(): MockLogger` — exported from `test/utils/mock-logger.ts` for consistent log assertions.
- `type MockFishRepositoryOverrides = Partial<FishRepository>`
- `createMockFishRepository(overrides?: MockFishRepositoryOverrides): FishRepository` — exported from `test/utils/mock-repository.ts` to isolate application tests.
- `type TestServerDeps = Readonly<{ config: Config; uploadHandler: Handler; getFishHandler: Handler; middleware: { apiKey: MiddlewareHandler; error: MiddlewareHandler } }>`
- `createTestServer(deps: TestServerDeps): Hono` — helper used by integration tests to spin up in-memory server.

## Steps
1. Establish testing conventions (naming, folder structure) in README.
2. Implement mocks/stubs under `src/infra/__mocks__` or similar to support unit tests.
3. Write integration test verifying `/get-fish` contract using mocked Firestore/Storage.
4. Update documentation once implementation stabilizes.

## Testing
- Run `pnpm coverage --filter art-backend` to confirm coverage stays above 90%.
- Document manual smoke testing steps for staging environment in README appendices.
