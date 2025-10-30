# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Unity-based interactive aquarium renderer for the machikane 25 art installation. The system displays animated fish that react to visitor proximity, polling fish metadata from a Cloud Run backend and downloading textures from Firebase Storage. Visitor detection uses OpenCVSharp to track movement and influence boid-based fish behavior.

## Common Development Commands

### Setup
```bash
# Install NuGet packages before opening Unity
dotnet restore
```

### Code Quality
```bash
# Verify code formatting (use before commits)
./lint.sh

# Auto-fix formatting issues
./lint:fix.sh
```

The linting commands run `dotnet format` against the `Assembly-CSharp.csproj` project to enforce consistent C# style.

### Testing
- **Unity Test Runner**: Open Unity Editor → Window → General → Test Runner
- **Edit Mode tests**: `Assets/Art/Tests/EditMode/` (unit tests, no scene required)
- **Play Mode tests**: `Assets/Art/Tests/PlayMode/` (integration tests with scene)
- **CLI**: `Unity -batchmode -runTests -testPlatform EditMode -projectPath $(pwd)`

Test files follow naming convention: `*Tests.cs` (e.g., `FishPollingControllerTests.cs`)

### Building
- Use Unity Editor Build Settings to create platform builds
- Output directory: `Builds/`
- Main scene: `Assets/Art/Scenes/Aquarium.unity`
- For CI/CD: `Unity -batchmode -quit -projectPath $(pwd) -buildTarget StandaloneOSX`

## Architecture
See ./ARCHITECTURE.md for detailed architecture documentation.

## Code Organization

```
Assets/Art/
├── Scripts/
│   ├── App/              # AppRoot bootstrap, editor utilities
│   ├── Fish/             # FishData, polling, repository, spawner
│   ├── Visitors/         # VisitorDetector, OpenCV wrappers, calibration
│   ├── Presentation/Schools/  # Boids simulation, SchoolCoordinator
│   ├── Rare/             # Rare character definitions, spawn handlers
│   ├── Telemetry/        # Sentry integration
│   └── Infrastructure/   # HTTP helpers, Firebase downloader, config utils
├── Configs/              # ScriptableObject assets (URLs, cadence, boids tuning)
├── Fish/                 # Prefabs, materials, textures
├── Scenes/               # Main scene: Aquarium.unity
└── Tests/
    ├── EditMode/         # Unit tests (no scene)
    └── PlayMode/         # Integration tests (with scene)
```

Third-party assets in `Assets/Idyllic Fantasy Nature/`, `Assets/TerrainSampleAssets/`, etc.

## Coding Conventions

- **Indentation**: 4 spaces
- **Naming**:
  - Classes/methods: `PascalCase`
  - Private fields: `camelCase` (use `_` prefix only when needed for clarity)
  - MonoBehaviours: Keep lean; use serialized fields for designer values
- **MonoBehaviour patterns**:
  - Prefer composition over deep inheritance
  - Use coroutines for time-based logic
  - Keep `Update()` methods lightweight
- **Configuration**: Store tunable values in ScriptableObjects under `Assets/Art/Configs/`
- **Dependencies**: Inject via inspector references on `AppRoot`; avoid singletons

## Testing Approach

- **EditMode**: Test controller logic, repository events, TTL, diff algorithms using deterministic fixtures
- **PlayMode**: Verify AppRoot wiring, prefab lifecycle, coordinator behavior with synthetic inputs
- Test data fixtures stored in `Assets/Tests/TestData/` (JSON payloads, recorded webcam frames)
- Aim for deterministic tests; mock time-based behaviors with dependency injection or test coroutines
- Document coverage gaps in PR when 100% is not achievable

## File References in Communication

When referencing code locations, use the format `file_path:line_number` for clarity:
- Example: "Visitor detection happens in `Assets/Art/Scripts/Visitors/VisitorDetector.cs:145`"

## Excluded Directories

Do not commit:
- `Library/` (Unity cache)
- `Temp/` (temporary build artifacts)
- `.idea/` (IDE settings)
- `obj/` (build intermediates)
- `Builds/` (build outputs, clean before releases)

See `.gitignore` for full list.

## Basic Philosophy of Development
- Don't just write code that works; always be conscious of quality, maintainability, and security.
- Strike the right balance according to the project phase (prototype, MVP, production).
- If you find a problem, don't ignore it. Always address it or explicitly document it.
- The Boy Scout Rule: Leave the codebase in a better state than you found it.

## Principles of Error Handling
- Always resolve errors, even those that seem only loosely related.
- Instead of suppressing errors (e.g., with `@ts-ignore` or empty `try-catch` blocks), fix the root cause.
- Detect errors early and provide clear error messages.
- Always cover error cases with tests.
- Always assume that external APIs and network communications can fail.

## Code Quality Standards
- DRY Principle: Avoid duplication and maintain a single source of truth.
- Clearly convey intent with meaningful variable and function names.
- Maintain a consistent coding style across the entire project.
- Don't ignore small problems; fix them as soon as they are found (Broken Windows Theory).
- Comments should explain "why," while the code itself should express "what."

## Testing Discipline
- Don't skip tests; if there's a problem, fix it.
- Test behavior, not implementation details.
- Avoid dependencies between tests so they can be run in any order.
- Tests should be fast and always return the same result (deterministic).
- Coverage is a metric; prioritize high-quality tests over high coverage numbers.

## Maintainability and Refactoring
- When adding new features, consider improving existing code at the same time.
- Break down large changes into small, incremental steps.
- Actively delete unused code.
- Regularly update dependencies for security and compatibility.
- Explicitly record technical debt in comments or documentation.

## Security Mindset
- Manage API keys, passwords, etc., with environment variables (never hardcode them).
- Validate all external input.
- Operate with the least privilege necessary (Principle of Least Privilege).
- Avoid unnecessary dependencies.
- Run security audit tools regularly.

## Performance Awareness
- Optimize based on measurement, not guesswork.
- Consider scalability from the initial stages of development.
- Defer loading resources until they are needed (lazy loading).
- Define clear cache expiration and invalidation strategies.
- Avoid N+1 problems and over-fetching data.

## Ensuring Reliability
- Set appropriate timeouts for operations.
- Implement retry mechanisms (consider exponential backoff).
- Utilize the Circuit Breaker pattern for fault tolerance.
- Build in resilience against temporary failures.
- Ensure observability with appropriate logging and metrics.

## Understanding Project Context
- Balance business requirements with technical requirements.
- Determine the level of quality that is truly necessary for the current phase of the project.
- Even with time constraints, maintain minimum quality standards.
- Choose implementation strategies that match the technical level of the entire team.

## Recognizing Trade-offs
- It's impossible to make everything perfect (there is no silver bullet).
- Find the optimal balance within the given constraints.
- Prioritize simplicity for prototypes and robustness for production.
- Clearly document any compromises made and the reasons for them.

## Basic Git Operations
- Use the Conventional Commits format (e.g., `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- Commits should be atomic and focus on a single, logical change.
- Write clear and descriptive commit messages in Japanese.
- Avoid committing directly to the `main` or `master` branch.

## Code Review Attitude
- Receive review comments as constructive suggestions for improvement.
- Focus on the code, not the person who wrote it.
- Clearly explain the reason for and the impact of your changes.
- Welcome feedback as a learning opportunity.

## Debugging Best Practices
- Establish a reliable procedure to reproduce the problem.
- Narrow down the scope of the problem using a binary search approach.
- Start your investigation from the most recent changes.
- Utilize appropriate tools like debuggers and profilers.
- Document your findings and solutions to share knowledge with the team.

## Dependency Management
- Only add dependencies that are truly necessary.
- Always commit lock files (e.g., `package-lock.json`).
- Before adding a new dependency, check its license, size, and maintenance status.
- Update dependencies regularly to apply security patches and bug fixes.

## Documentation Standards
- The README should clearly describe the project's overview, setup process, and usage instructions.
- Keep documentation updated in sync with the code.
- Prioritize providing practical examples.
- Record important design decisions in ADRs (Architecture Decision Records).

## Continuous Improvement
- Apply lessons learned to future projects.
- Hold regular retrospectives to improve team processes.
- Properly evaluate and adopt new tools and methodologies.
- Document knowledge for the benefit of the team and future developers.
