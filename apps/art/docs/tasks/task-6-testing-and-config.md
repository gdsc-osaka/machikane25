# Task 6: Testing, Tooling, and Release Config

## Architectural Context
Ties together the validation guidance from `Architecture.md` (**Testing Approach**, **Configuration & Secrets**, **Backend Integration Notes**) and ensures the simplified controller architecture stays verifiable. This task formalises the test suites, fixtures, build steps, and documentation that support Tasks 1–5.

## Directory & Asset Layout
- `Assets/Art/Tests/EditMode/`
  - `Fish/FishRepositoryTests.cs`
  - `Fish/FishPollingControllerTests.cs`
  - `Visitors/VisitorDetectorTests.cs`
  - `Rare/RareCharacterControllerTests.cs`
  - `Telemetry/TelemetryLoggerTests.cs`
  - Assembly definition: `Assets/Art/Tests/EditMode/EditModeTests.asmdef`.
- `Assets/Art/Tests/PlayMode/`
  - `App/AppRootPlayTests.cs`
  - `Fish/FishSpawnerPlayTests.cs`
  - `Visitors/SchoolCoordinatorVisitorTests.cs`
  - Assembly definition: `Assets/Art/Tests/PlayMode/PlayModeTests.asmdef`.
- `Assets/Tests/TestData/`
  - `fish/sample_payload.json`
  - `fish/updated_payload.json`
  - `textures/fallback.png`
  - `visitors/frame_*.png`
  - Ensure `.meta` files accompany all assets for Unity import.
- Documentation:
  - `docs/testing.md` (new) summarising commands and suite scope.
  - Update `README.md` with quickstart testing/build instructions.

## Test Coverage Expectations
- **Fish Domain**
  - `FishRepositoryTests`: TTL enforcement, add/update/remove diffing, snapshot consistency.
  - `FishPollingControllerTests`: interval clamping, error backoff, DTO parsing using stub HTTP layer.
- **Spawning & Textures**
  - `FishSpawnerPlayTests`: prefab lifecycle triggered by simulated repository events, placeholder vs final texture handling.
  - `FishTextureCacheTests` (edit mode) for disk caching behaviour.
- **Visitor Detection**
  - `VisitorDetectorTests`: process recorded frames, validate centroid counts & smoothing, verify calibration transform.
  - `SchoolCoordinatorVisitorTests`: confirm visitor attractors alter agent velocity using stub agents.
- **Rare & Telemetry**
  - Rare spawn probability, single-active enforcement, telemetry event emission.
  - `TelemetryLoggerTests`: DSN/no-DSN behaviours, breadcrumb formatting, exception capture.
- **Bootstrap**
  - `AppRootPlayTests`: ensures `Initialize` is called on controllers, coroutines start/stop, missing references produce clear errors.

## Tooling & Automation
1. **Test Assemblies**
   - Create `.asmdef` files for edit/play mode tests referencing required runtime assemblies (e.g., `UnityEngine`, `UnityEngine.TestRunner`, project runtime asmdef).
   - Enable `overrideReferences` to keep dependencies minimal.

2. **Command-Line Hooks**
   - Add Unity CLI commands to `README.md`:
     - `Unity -batchmode -projectPath "$(pwd)" -runTests -testPlatform EditMode`
     - `Unity -batchmode -projectPath "$(pwd)" -runTests -testPlatform PlayMode`
   - Document `dotnet restore` and `./lint.sh` invocation order.

3. **CI Integration**
   - Provide sample GitHub Actions snippet (if repo uses GH) or note for internal CI covering:
     - Restore, lint, edit-mode tests, play-mode tests.
   - Ensure caching of `Library/` is optional to keep pipelines deterministic.

4. **Fixture Management**
   - For recorded visitor frames, store low-resolution PNGs (<512 KB) to avoid repo bloat; consider Git LFS if larger.
   - Add README in `Assets/Tests/TestData` outlining provenance and usage.

5. **Configuration Docs**
   - Extend `docs/testing.md` with:
     - Table of `AppConfig` fields (backend URL, API key, poll cadence, TTL, rare spawn odds).
     - Steps for swapping between staging/production configs.
     - Reminder to exclude real API keys from version control.
   - Provide release checklist: confirm correct `AppConfig` asset, run tests, run `./lint.sh`, build via Unity Build Settings outputting to `Builds/`.

6. **Local Developer Experience**
   - Add editor script (optional) `Assets/Art/Editor/TestUtilities.cs` with menu items for running tests or spawning sample fish/visitors.
   - Document how to enable visitor detection debug overlay and telemetry test event (ties to Task 5).

## Dependencies
- Requires implementations from Tasks 1–5 to exist for meaningful tests.
- Feeds into release readiness for kiosk builds; automation should run before packaging.

## Risks & Mitigations
- **Flaky Play Mode Tests**: keep scenes minimal, use synthetic data instead of real network/webcam where possible.
- **Large Test Assets**: compress textures and frames; adopt Git LFS for anything substantial.
- **CI Runtime**: batch mode play tests can be slow; parallelise edit/play or run nightly if pipeline budgets limited.

## Acceptance Criteria
- Both edit mode and play mode test suites run green locally and via documented CLI commands.
- `docs/testing.md` (or equivalent README section) clearly states testing + build expectations.
- Sample fixtures checked in with `.meta` files and referenced by tests.
- Developers can execute a full validation loop (restore, lint, test) without manual scene tweaks.
