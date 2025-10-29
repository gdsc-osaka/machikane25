# Repository Guidelines

## Project Structure & Module Organization
Source scenes, prefabs, and scripts live in `Assets/`, with custom logic under `Assets/Art` (for interactive pieces) and third-party content in `Assets/Idyllic Fantasy Nature`, `Assets/TerrainSampleAssets`, and similar vendor folders. Project-wide settings reside in `ProjectSettings/`, while package manifests are in `Packages/`. Exported builds should land in `Builds/`; keep this directory clean by removing obsolete binaries when a release is cut. NuGet dependencies for embedded .NET tooling live under `Assets/NuGet`.

## Build, Test, and Development Commands
Restore managed dependencies before opening Unity: `dotnet restore`. Run the formatting gate with `./lint.sh` (verifies `dotnet format` stays clean) and apply fixes via `./lint:fix.sh`. Use the Unity Editor’s Build Settings to produce platform targets, saving outputs inside `Builds/`. For automated pipelines, prefer Unity CLI in batch mode (`Unity -batchmode -quit -projectPath $(pwd) -buildTarget StandaloneOSX`) and commit the invoked command to the PR description.

## Coding Style & Naming Conventions
Write C# scripts with 4-space indentation, `PascalCase` classes, and `camelCase` private fields prefixed with `_` only when required for clarity. Keep MonoBehaviours lean: use serialized fields for designer-tuned values and move shared logic into plain C# helpers. Place art assets, materials, and prefabs beside the scene that owns them, pairing each asset with its `.meta` file. Run `./lint:fix.sh` before submitting to keep formatting consistent.

## Testing Guidelines
Adopt the Unity Test Framework. Store Edit Mode specs in `Assets/Tests/EditMode` and Play Mode specs in `Assets/Tests/PlayMode`, using filenames like `FishControllerTests.cs`. Aim for deterministic tests that run without scene interactivity; mock time-based behaviors with coroutines or dependency injection. Execute suites through Unity Test Runner or command line (`Unity -batchmode -runTests -testPlatform EditMode`). Document coverage gaps in the PR if 100% is not attainable.

## Commit & Pull Request Guidelines
Write commits in imperative mood (e.g., `add fish flocking controls`). Each PR must include: concise summary, linked issue or task ID, screenshots or capture of new interactions, confirmation that `dotnet restore`, `./lint.sh`, and required Unity tests were run, and a checklist of affected scenes or prefabs. Request reviews from art and engineering owners when modifying shared assets.

## Asset & Configuration Tips
Do not commit `.idea`, temporary cache directories (`Library/`, `Temp/`), or local PlayerPrefs. Store secrets (API keys, Remote Config values) outside the repo and document additions in `Design Doc.md`. For large binary assets, prefer Git LFS and update the README with storage instructions before merging.
