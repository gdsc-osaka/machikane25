# Quality & Operations Implementation Plan

## Objectives
- Maintain high developer confidence through fast unit tests and targeted integration coverage.
- Document operational expectations for deployments, monitoring, and incident response.

## Deliverables
- Testing
  - Add unit tests alongside implementation files (`__tests__` folders) covering domain, application, controller logic.
  - Create mocks for infrastructure ports to enable deterministic tests.
  - Maintain single integration test `test/integration/renderer-contract.test.ts` hitting HTTP surface with in-memory adapters.
- Coverage & Tooling
  - Ensure Vitest config includes path aliases if introduced.
  - Update `pnpm test:art-backend` script if differentiation from workspace default is required.
- Documentation
  - Extend `README.md` with setup instructions, env variable table, and logging expectations.
  - Note deployment steps (Cloud Run + Firebase Hosting rewrite) and how logs surface in Google Cloud.

## Steps
1. Establish testing conventions (naming, folder structure) in README.
2. Implement mocks/stubs under `src/infra/__mocks__` or similar to support unit tests.
3. Write integration test verifying `/get-fish` contract using mocked Firestore/Storage.
4. Update documentation once implementation stabilizes.

## Testing
- Run `pnpm coverage --filter art-backend` to confirm 100% target.
- Document manual smoke testing steps for staging environment in README appendices.
