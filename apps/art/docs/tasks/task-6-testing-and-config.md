# Task 6: Testing, Tooling, and Release Config

## Objective
Establish the testing infrastructure, linting hooks, and release configuration needed to keep the renderer maintainable and ship-ready.

## Scope
- Set up Unity Test Framework suites under `Assets/Art/Tests/EditMode` and `Assets/Art/Tests/PlayMode` aligned with the architecture’s coverage goals.
- Add fixtures for fish payloads, recorded webcam frames, and texture samples under `Assets/Tests/TestData`.
- Integrate project automation scripts (`dotnet restore`, `./lint.sh`, Unity CLI test runs) into CI guidance.
- Document build pipeline steps for generating kiosk-ready binaries and verifying configuration prior to release.

## Deliverables
- Edit mode tests covering repository diff logic, TTL behaviour, visitor detection algorithms (with deterministic inputs).
- Play mode tests validating `AppRoot` bootstrap, fish spawn/despawn flows, and visitor-to-boids integration.
- Test data assets stored with `.meta` files and referenced by scenes/scripts.
- Documentation updates describing how to run tests locally (Unity Test Runner UI + CLI) and how to configure builds for different environments.

## Implementation Steps
1. Scaffold test assembly definitions (`asmdef`) around `Assets/Art/Tests` to isolate dependencies.
2. Create deterministic fixtures (JSON payloads, PNGs, recorded frames) and ensure they are accessible via tests.
3. Implement edit mode tests leveraging mocks/stubs for HTTP and texture clients.
4. Implement play mode tests that exercise runtime wiring with lightweight scenes or the main scene in test mode.
5. Update repo docs (README or dedicated section) with testing/build commands and expected pre-commit checklist.

## Dependencies & Notes
- Depends on functionality from Tasks 1–5 to provide concrete behaviours for testing.
- Coordinate with automation owners to align test execution with Unity CLI in CI.
- Ensure large binary fixtures use Git LFS if they exceed repository limits; document storage strategy if required.
