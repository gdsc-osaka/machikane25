# Task 1: App Bootstrap & Controller Wiring

## Architectural Context
Implements the renderer boot sequence outlined in `Architecture.md` under **System Overview**, **Runtime Data Flow**, and **Boot Sequence**. The aim is to keep the bootstrap lightweight: `AppRoot` reads configuration, hands it to controller behaviours, and starts the two coroutines that drive polling and rare character spawns. No service registry or dependency injection container is required.

## Directory & Asset Layout
- `Assets/Art/Scenes/Aquarium.unity`
  - Scene entry point with an `AppRoot` GameObject (prefab optional) holding serialized references to each controller.
- `Assets/Art/Scripts/App/`
  - `AppRoot.cs`: orchestrates initialization, coroutine lifetime, and simple error handling.
  - `AppConfig.cs`: ScriptableObject carrying backend URL, API key, polling cadence limits, rare spawn odds, and telemetry DSN.
- `Assets/Art/Scripts/Fish/`
  - `FishPollingController.cs`, `FishRepository.cs`, `FishSpawner.cs`, `FishTextureCache.cs`.
- `Assets/Art/Scripts/Visitors/VisitorDetector.cs`
- `Assets/Art/Scripts/Rare/RareCharacterController.cs`
- `Assets/Art/Scripts/Telemetry/TelemetryLogger.cs`

## Key Behaviours
```csharp
// Assets/Art/Scripts/App/AppRoot.cs
public sealed class AppRoot : MonoBehaviour
{
    [SerializeField] private AppConfig config;
    [Header("Controllers")]
    [SerializeField] private FishPollingController fishPolling;
    [SerializeField] private FishRepository fishRepository;
    [SerializeField] private FishSpawner fishSpawner;
    [SerializeField] private VisitorDetector visitorDetector;
    [SerializeField] private RareCharacterController rareCharacters;
    [SerializeField] private TelemetryLogger telemetry;

    private Coroutine pollingRoutine;
    private Coroutine rareRoutine;

    private void Awake()
    {
        ValidateConfig();

        telemetry.Initialize(config.sentryDsn);
        fishRepository.Initialize(config.fishTtlSeconds);
        fishSpawner.Initialize(fishRepository, telemetry);
        fishPolling.Initialize(config, fishRepository, telemetry);
        visitorDetector.Initialize(config, telemetry);
        rareCharacters.Initialize(config, fishSpawner, telemetry);

        pollingRoutine = StartCoroutine(fishPolling.Run());
        rareRoutine = StartCoroutine(rareCharacters.Run());
        visitorDetector.StartDetection();
    }

    private void OnDestroy()
    {
        if (pollingRoutine != null) StopCoroutine(pollingRoutine);
        if (rareRoutine != null) StopCoroutine(rareRoutine);
        visitorDetector.StopDetection();
        telemetry.Flush();
    }

    private void ValidateConfig()
    {
        if (config == null)
        {
            Debug.LogError("AppRoot missing AppConfig reference.");
        }
    }
}
```

```csharp
// Assets/Art/Scripts/Fish/FishPollingController.cs
public sealed class FishPollingController : MonoBehaviour
{
    private AppConfig config;
    private FishRepository repository;
    private TelemetryLogger telemetry;
    private float currentInterval;

    public void Initialize(AppConfig cfg, FishRepository repo, TelemetryLogger telemetryLogger)
    {
        config = cfg;
        repository = repo;
        telemetry = telemetryLogger;
        currentInterval = cfg.pollIntervalSeconds;
    }

    public IEnumerator Run()
    {
        while (enabled && config != null)
        {
            yield return FetchOnce();
            yield return new WaitForSeconds(currentInterval);
        }
    }

    private IEnumerator FetchOnce()
    {
        // UnityWebRequest logic goes here (Task 2 expands this).
        yield break;
    }
}
```

`FishRepository`, `FishSpawner`, `VisitorDetector`, `RareCharacterController`, and `TelemetryLogger` each expose a simple `Initialize` method to accept dependencies. Where a plain C# class suffices (`FishRepository`, `FishTextureCache`, `TelemetryLogger`), construct it directly and mark the field `[SerializeReference]` or instantiate inside `AppRoot` if that keeps the inspector clean.

## Detailed Logic
1. **Configuration Load**
   - `AppRoot` references an `AppConfig` asset. During `Awake`, verify it is assigned and contains basic values (non-empty backend URL, sensible polling limits, optional Sentry DSN).
   - For kiosk builds, authors will swap `AppConfig` assets (e.g., staging vs production) manually before building—no runtime overrides.

2. **Controller Initialization**
   - `AppRoot` calls `Initialize` on each controller with the minimum dependencies it needs (config, repository, telemetry, etc.).
   - `FishRepository` builds its internal dictionaries and TTL timer values.
   - `FishSpawner` subscribes to repository events.
   - `VisitorDetector` prepares webcam capture but delays heavy work until `StartDetection`.

3. **Coroutine Management**
   - Launch two coroutines: `fishPolling.Run()` for backend polling and `rareCharacters.Run()` for rare-character timers.
   - Store coroutine handles so `OnDestroy` can stop them cleanly.

4. **Visitor Detection Lifecycle**
   - `visitorDetector.StartDetection()` begins the webcam capture loop.
   - `OnDestroy` must call `visitorDetector.StopDetection()` to release the camera.

5. **Telemetry Setup**
   - `telemetry.Initialize` sets up the Sentry DSN and basic context (build, platform).
   - Controllers log significant milestones (poll success/failure, rare spawn, visitor detector errors) through the shared telemetry instance.

6. **Error Handling**
   - Missing configuration or controller references should surface clear Unity console errors and disable polling until resolved.
   - Wrap coroutine bodies with try/catch blocks that log exceptions via `telemetry.LogException`.

## Testing & Validation
- Edit Mode: instantiate `AppRoot` in a test scene using test doubles for controllers to confirm `Awake` calls `Initialize` in the expected order.
- Play Mode: load `Aquarium.unity` and ensure `AppRoot` starts/stops coroutines without `NullReferenceException`.
- Validate `AppConfig` assets: add an `OnValidate` method checking URL/API key formatting and poll cadence bounds.

## Dependencies
- Prereqs: none. This task unblocks Task 2 (Fish Polling), Task 3 (Fish Spawning), Task 4 (Visitor Detection), Task 5 (Rare Characters & Telemetry), and Task 6 (Testing).

## Risks & Mitigations
- **Missing Inspector References**: create a one-time editor script or use `[Required]` attributes to highlight missing fields.
- **Coroutine Leakage**: always guard `StartCoroutine` calls with stored handles so `OnDestroy` can stop them.
- **Configuration Mistakes**: provide clear log guidance when URLs/keys are missing so on-site debugging is fast.
