# Task 5: Rare Characters & Telemetry

## Architectural Context
Follows `Architecture.md` sections **Runtime Data Flow**, **Core Components** (`RareCharacterController`, `TelemetryLogger`), **Rare Character System**, and **Logging and Error Handling**. This task introduces occasional rare-character spawns and ensures the renderer reports telemetry to Sentry.

## Directory & Asset Layout
- `Assets/Art/Scripts/Rare/`
  - `RareCharacterController.cs`
  - `RareCharacterDefinition.cs` (ScriptableObject describing prefab, FX, weights).
- `Assets/Art/Scripts/Telemetry/`
  - `TelemetryLogger.cs`
  - `TelemetryEvents.cs` constants.
- `Assets/Art/Fish/Rare/` prefabs, materials, audio cues.
- Config:
  - `AppConfig.asset` fields for rare spawn chance (`rareSpawnIntervalSeconds`, `rareSpawnProbability`).
  - `RareCharacterSet.asset` (array of definitions).
- Tests:
  - `Assets/Art/Tests/EditMode/Rare/RareCharacterControllerTests.cs`
  - `Assets/Art/Tests/EditMode/Telemetry/TelemetryLoggerTests.cs`

## Key Components
```csharp
// Assets/Art/Scripts/Rare/RareCharacterDefinition.cs
[CreateAssetMenu(menuName = "Art/Rare/Rare Character")]
public sealed class RareCharacterDefinition : ScriptableObject
{
    public GameObject prefab;
    public AudioClip spawnSfx;
    [Range(0, 1)] public float weight = 0.1f;
    public float attractorStrength = 2.0f;
}
```

```csharp
// Assets/Art/Scripts/Rare/RareCharacterController.cs
public sealed class RareCharacterController : MonoBehaviour
{
    [SerializeField] private FishSpawner fishSpawner;
    [SerializeField] private RareCharacterDefinition[] definitions;
    [SerializeField] private float checkIntervalSeconds = 30f;

    private TelemetryLogger telemetry;
    private AppConfig config;
    private System.Random random;

    public void Initialize(AppConfig config, FishSpawner spawner, TelemetryLogger logger)
    {
        this.config = config;
        fishSpawner = spawner;
        telemetry = logger;
        random = new System.Random();
        checkIntervalSeconds = config.rareCheckIntervalSeconds;
    }

    public IEnumerator Run()
    {
        while (enabled)
        {
            yield return new WaitForSeconds(checkIntervalSeconds);
            TrySpawn();
        }
    }

    private void TrySpawn()
    {
        if (definitions.Length == 0 || config == null) return;
        if (random.NextDouble() > config.rareSpawnProbability) return;

        var definition = PickWeightedDefinition();
        fishSpawner.SpawnRare(definition);
        telemetry.LogEvent(TelemetryEvents.RareSpawned, new { definition = definition.name });
    }
}
```

```csharp
// Assets/Art/Scripts/Telemetry/TelemetryLogger.cs
public sealed class TelemetryLogger
{
    private string currentDsn;

    public void Initialize(string dsn)
    {
        currentDsn = dsn;
        if (string.IsNullOrEmpty(dsn)) return;
        SentryUnity.Init(options =>
        {
            options.Dsn = dsn;
            options.Environment = Application.isEditor ? "editor" : "production";
            options.Release = Application.version;
        });
    }

    public void LogEvent(string name, object payload = null) { ... }
    public void LogException(Exception ex, object context = null) { ... }
    public void LogBreadcrumb(string category, string message, IDictionary<string, string> data = null) { ... }
    public void Flush() => SentrySdk.FlushAsync(TimeSpan.FromSeconds(2));
}
```

## Detailed Logic
1. **Rare Character Scheduling**
   - Use a simple timer (interval from `AppConfig`) with probability check (0–1). Keep logic deterministic for tests by injecting `Random` where needed.
   - `PickWeightedDefinition` calculates cumulative weights so some characters appear more often.
   - When spawning, call `fishSpawner.SpawnRare(definition)` which internally tags the fish for special handling (Task 3).
   - Provide `RareCharacterHandle` to ensure only one rare character active at a time (despawn after timeout or when next rare spawns).

2. **Visual & Audio Hooks**
   - Rare prefabs may include particle systems or animations; ensure `FishAgent` can flag them as rare so `SchoolCoordinator` treats them as strong attractors.
   - Trigger audio via `AudioSource.PlayClipAtPoint(definition.spawnSfx, position)` or dedicated audio manager.

3. **Telemetry Event Surface**
   - Define constants in `TelemetryEvents` (`fish_poll_success`, `fish_poll_failure`, `fish_texture_loaded`, `visitor_detector_update`, `rare_spawn`).
   - Instrument existing controllers (Tasks 2–4) to call `TelemetryLogger.LogEvent` with standard payload structure (anonymous object -> converted to JSON).
   - For exceptions, use `LogException` to capture stack traces and context (e.g., `new { endpoint = url }`).

4. **Breadcrumb Strategy**
   - When polling, log breadcrumbs before/after HTTP calls to help debugging network issues.
   - Visitor detector should add breadcrumbs when camera resumes or fails.

5. **Graceful Degradation**
   - If DSN missing, `TelemetryLogger` should no-op but still print to Unity console for local debugging.
   - Provide toggle in `AppConfig` (`telemetryEnabled`) to disable telemetry during offline demos.

6. **Docs & Monitoring**
   - Update repo README with Sentry project URL and instructions for viewing events.
   - Provide an in-editor menu item (`Art/Send Test Telemetry`) that triggers a sample event for verifying configuration.

## Testing & Validation
- **Edit Mode**
  - `RareCharacterControllerTests`: use deterministic random seed to verify spawn probability and single-active behaviour.
  - `TelemetryLoggerTests`: confirm DSN/no-DSN codepaths, event payload formatting, and exception capture.
- **Play Mode**
  - Trigger manual spawn via inspector button to ensure rare character flows through `FishSpawner` and influences boids.
  - Validate telemetry entries when running with staging DSN (use Sentry test project).

## Dependencies
- Relies on Task 1 for `TelemetryLogger` initialization and coroutine wiring.
- Depends on Task 3’s spawner for actual prefab instantiation and Task 4’s `SchoolCoordinator` to react to rare attractors.

## Risks & Mitigations
- **Overactive Spawns**: expose probability and cooldown in inspector; add clamp to ensure at most one rare spawn per X minutes.
- **Telemetry Latency**: flush on application quit via `AppRoot` to avoid losing events.
- **Privacy**: do not include visitor imagery or PII in telemetry payloads; stick to counts and metadata.
