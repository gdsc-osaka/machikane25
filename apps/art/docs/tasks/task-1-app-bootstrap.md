# Task 1: App Bootstrap & Service Registry

## Architectural Context
This task realises the renderer boot sequence described in `Architecture.md` (see sections **System Overview**, **Boot Sequence**, and **Service Surface**). It creates the foundation that other gameplay systems plug into, ensuring `AppRoot` and `ServiceRegistry` orchestrate configuration, polling, visitor detection, rare characters, and telemetry.

## Directory & Asset Layout
- `Assets/Art/Scenes/Aquarium.unity`  
  - Scene entry point. Must reference an `AppRoot` prefab or GameObject with required serialized fields.
- `Assets/Art/Scripts/App/`
  - `AppRoot.cs`: MonoBehaviour owning lifecycle hooks (`Awake`, `Start`, `OnDestroy`).
  - `ServiceLocatorBehaviour.cs` (optional helper to expose registry to scene objects).
- `Assets/Art/Scripts/Infrastructure/`
  - `ServiceRegistry.cs`: plain C# composition root.
  - Interface definitions for infrastructure services (`IFishApiClient`, `IFishTextureClient`, `ITelemetrySink`, etc.).
  - Concrete configuration loaders (e.g., `AppConfigLoader.cs`).
- `Assets/Art/Scripts/Domain/`
  - Domain-level interfaces referenced by the registry (`IFishRepository`, `IVisitorDetector`, `IRareCharacterService`, etc.).
- `Assets/Art/Configs/`
  - `AppConfig.asset`: ScriptableObject storing environment-specific endpoints, keys, cadence bounds, telemetry DSN.
  - Future environment overrides (e.g., `AppConfig.Staging.asset`, `AppConfig.Production.asset`).

## Key Classes & Interfaces
```csharp
// Assets/Art/Scripts/App/AppRoot.cs
public sealed class AppRoot : MonoBehaviour
{
    [SerializeField] private AppConfig config;
    private ServiceRegistry registry;

    private void Awake()
    {
        registry = ServiceRegistry.Create(config);
        registry.Telemetry.RegisterSceneContext(gameObject.scene);
        StartCoroutine(registry.FishPolling.Run());
        StartCoroutine(registry.RareCharacters.Run());
        registry.Telemetry.BeginSession();
    }

    private void OnDestroy()
    {
        registry?.Dispose();
    }
}
```

```csharp
// Assets/Art/Scripts/Infrastructure/ServiceRegistry.cs
public sealed class ServiceRegistry : IDisposable
{
    private readonly Dictionary<Type, object> services = new();

    private ServiceRegistry() {}

    public static ServiceRegistry Create(AppConfig config)
    {
        var registry = new ServiceRegistry();
        registry.RegisterSingleton<ITelemetrySink>(new SentryTelemetry(config.sentryDsn));
        registry.RegisterSingleton<IFishApiClient>(new FishApiClient(config));
        registry.RegisterSingleton<IFishRepository>(new FishRepository(config.fishTtl));
        registry.RegisterSingleton<IFishPollingService>(new FishPollingService(
            registry.Get<IFishApiClient>(),
            registry.Get<IFishRepository>(),
            registry.Get<ITelemetrySink>(),
            config.pollingCadence));
        // Additional services wired here (texture client, visitor detection, etc.).
        return registry;
    }

    public T Get<T>() where T : class => (T)services[typeof(T)];

    public void RegisterSingleton<T>(T instance) where T : class
    {
        services[typeof(T)] = instance;
    }

    public void Dispose()
    {
        foreach (var disposable in services.Values.OfType<IDisposable>())
        {
            disposable.Dispose();
        }
    }
}
```

```csharp
// Assets/Art/Scripts/Infrastructure/AppConfig.cs
[CreateAssetMenu(menuName = "Art/App Config", fileName = "AppConfig")]
public sealed class AppConfig : ScriptableObject
{
    [Header("Backend")]
    public string backendBaseUrl;
    public string apiKey;

    [Header("Polling")]
    public float pollIntervalSeconds = 30f;
    public float pollIntervalMinSeconds = 15f;
    public float pollIntervalMaxSeconds = 60f;

    [Header("Telemetry")]
    public string sentryDsn;

    [Header("Visitor Detection")]
    public string calibrationProfileId;
}
```

## Detailed Logic
1. **Configuration Load**  
   - `AppRoot` serializes an `AppConfig` asset reference. During `Awake`, it validates required fields (non-empty URL, API key unless running in editor, DSN optional).
   - Optional: extend `AppConfig` to pull overrides from environment variables for kiosk builds.

2. **Service Registry Construction**  
   - `ServiceRegistry.Create(AppConfig)` wires all baseline services described in `Architecture.md` table (**Service Surface**).  
   - Order: telemetry (so subsequent services can log), HTTP clients, repositories, polling, visitor detection, rare character scheduler, texture cache, school coordinator.
   - Use `RegisterSingleton` for singletons; expose strongly typed accessors (`registry.FishPolling`) or rely on `Get<T>()`.

3. **Lifecycle Management**  
   - `AppRoot.Awake()` instantiates registry, kicks off coroutines for polling and rare characters with `StartCoroutine`.
   - `AppRoot.Start()` informs presentation components (e.g., `SchoolCoordinator`) via `ServiceLocatorBehaviour` or static accessor about the ready registry.
   - `OnDestroy()` disposes services; ensure coroutines are stopped and network clients shut down gracefully.

4. **Scene Access Pattern**  
   - Non-AppRoot behaviours request services in `Start()`:
     ```csharp
     private IFishRepository fishRepository;
     private void Start()
     {
         fishRepository = ServiceLocator.Require<IFishRepository>();
         fishRepository.FishAdded += HandleFishAdded;
     }
     ```
   - `ServiceLocator` can be a thin wrapper storing the active registry (set in `AppRoot.Awake`).

5. **Telemetry Integration**  
   - During boot, `TelemetryService` begins a session, tags environment info (`Application.platform`, configuration profile), and logs boot milestones (`BootPhase.AppRootAwake`, `BootPhase.ServicesReady`).

6. **Fallback & Error Handling**  
   - If critical services fail (e.g., missing config), display an in-editor warning and halt coroutines to avoid null dereferences.
   - Provide inspector-level validation by implementing `OnValidate()` in `AppRoot` to check serialized references.

## Interface Definitions (Initial Set)
```csharp
public interface IFishPollingService
{
    IEnumerator Run();
}

public interface IFishRepository
{
    event Action<FishState> FishAdded;
    event Action<FishState> FishUpdated;
    event Action<string> FishExpired;
    IReadOnlyCollection<FishState> Snapshot();
}

public interface IVisitorDetector
{
    event Action<IReadOnlyList<VisitorGroup>> VisitorsUpdated;
    void StartDetection();
    void StopDetection();
}

public interface ITelemetrySink
{
    void BeginSession();
    void LogEvent(string eventName, IDictionary<string, object> data = null);
    void CaptureException(Exception ex, IDictionary<string, object> context = null);
    void RegisterSceneContext(Scene scene);
}
```

These interfaces enable Tasks 2–5 to target abstractions without knowing concrete implementations.

## Testing & Validation
- Author lightweight edit-mode tests for `ServiceRegistry` ensuring required services are registered and retrievable.
- Add play mode smoke test verifying `AppRoot` boots with stub implementations, starts coroutines, and disposes cleanly.
- Validate configuration assets in editor by loading `Aquarium.unity` and confirming inspector reports no missing references.

## Dependencies
- None upstream, but this task must land before Tasks 2–5 (polling, spawning, visitor detection, rare+telemetry) to guarantee shared infrastructure.
- Coordinate with Task 6 for test assembly definitions; Task 6 will extend tests started here.

## Risks & Mitigations
- **Configuration drift**: Document how to swap `AppConfig` assets per environment; consider a build preflight script.
- **Service access timing**: Ensure `ServiceRegistry` is available before other behaviours run. Use `RuntimeInitializeOnLoadMethod` if script execution order becomes an issue.
- **Lifecycle leaks**: Keep track of coroutines started by services; ensure `Dispose()` stops them or uses `CancellationToken`.
