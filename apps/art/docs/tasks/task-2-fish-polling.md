# Task 2: Fish Polling & Repository

## Architectural Context
Implements the data ingestion path covered in `Architecture.md` under **Runtime Data Flow**, **Core Components**, **Fish Domain Model**, and **Texture Pipeline** (for downstream consumers). This task delivers the pieces that keep fish metadata current by polling `/get-fish`, diffing results, and notifying the rest of the scene.

## Directory & Asset Layout
- `Assets/Art/Scripts/Fish/`
  - `FishPollingController.cs`
  - `FishRepository.cs`
  - `FishDto.cs`, `FishState.cs`, mapping helpers.
  - `FishPayloadDiff.cs` (optional helper for diff logic).
- `Assets/Art/Scripts/Infrastructure/`
  - `HttpClientFactory.cs` or simple helper for `UnityWebRequest`.
  - `JsonUtilityExtensions.cs` (if needed for parsing).
- `Assets/Art/Configs/AppConfig.asset`
  - Must expose polling defaults (`pollIntervalSeconds`, min/max clamp) and TTL seconds (`fishTtlSeconds`).
- Tests:
  - `Assets/Art/Tests/EditMode/Fish/FishRepositoryTests.cs`
  - `Assets/Art/Tests/EditMode/Fish/FishPollingControllerTests.cs`
  - Test payloads under `Assets/Tests/TestData/Fish/`.

## Key Types & Interfaces
```csharp
// Assets/Art/Scripts/Fish/FishDto.cs
[Serializable]
public sealed class FishDto
{
    public string id;
    public string imageUrl;
    public string color;      // hex from backend
    public string createdAt;  // ISO-8601
}
```

```csharp
// Assets/Art/Scripts/Fish/FishState.cs
public sealed class FishState
{
    public string Id { get; }
    public string ImageUrl { get; }
    public Color Tint { get; }
    public DateTime CreatedAt { get; }

    public FishState(string id, string imageUrl, Color tint, DateTime createdAt) { ... }
}
```

```csharp
// Assets/Art/Scripts/Fish/FishRepository.cs
public sealed class FishRepository : MonoBehaviour
{
    private readonly Dictionary<string, FishState> fishById = new();
    private float ttlSeconds;
    private float lastPurgeTime;

    public event Action<FishState> FishAdded;
    public event Action<FishState> FishUpdated;
    public event Action<string> FishRemoved;

    public void Initialize(float ttlSecondsConfig) { ... }
    public IReadOnlyList<FishState> Snapshot() { ... }
    public FishDiffResult ApplyPayload(IReadOnlyList<FishState> nextStates) { ... }
    public void PurgeExpired(float currentTimeSeconds) { ... }
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
    private int consecutiveFailures;

    public void Initialize(AppConfig cfg, FishRepository repo, TelemetryLogger logger) { ... }
    public IEnumerator Run()
    {
        while (enabled && config != null)
        {
            yield return FetchOnce();
            yield return new WaitForSeconds(currentInterval);
        }
    }
    private IEnumerator FetchOnce() { ... }
}
```

## Detailed Logic
1. **Initialization**
   - `AppRoot` calls `Initialize(config, repository, telemetry)` during Task 1.
   - The controller reads `config.pollIntervalSeconds` and clamps it between `config.pollIntervalMinSeconds` / `config.pollIntervalMaxSeconds`.
   - `FishRepository.Initialize(ttlSeconds)` stores TTL and resets its dictionaries.

2. **HTTP Polling**
   - Use `UnityWebRequest` (GET `${config.backendBaseUrl}/get-fish`) with `X-API-KEY: config.apiKey`.
   - On success (HTTP 200) parse JSON into `FishDto[]` using `JsonUtility` or `System.Text.Json` if available.
   - Convert each DTO to `FishState` by applying hue-to-`Color` conversion (HSV histogram described in design doc; implement as helper).
   - Push the list into `FishRepository.ApplyPayload`, capturing added/updated/removed sets.
   - Reset failure counter and adjust `currentInterval` if the backend emits `Cache-Control` or custom headers (optional, keep to min/avg defaults if absent).

3. **Retry & Backoff**
   - On failure (network error or non-200 response) increment `consecutiveFailures`, clamp `currentInterval` toward `config.pollIntervalMaxSeconds`, and log via `telemetry.LogEvent("fish_poll_failed", ...)`.
   - After `n` failures (e.g., 3) raise a warning in Unity console and keep showing cached fish.
   - Successful poll resets interval to default.

4. **Repository Diffing**
   - `FishRepository.ApplyPayload` should:
     - Iterate inbound states, compare to existing map.
     - Detect updates when `ImageUrl` or `Tint` changes.
     - Raise events for added/updated fish immediately on the main thread.
   - Purge entries absent from the payload (fish removed on backend) and raise `FishRemoved`.
   - Call `PurgeExpired` each poll or on `Update()` to drop fish older than TTL relative to `DateTime.UtcNow`.

5. **Telemetry Hooks**
   - Log successes with counts (`fish_poll_success` event includes `added`, `updated`, `removed`, `durationMs`).
   - Record failure details (status code, exception messages) for debugging.

6. **Editor Instrumentation**
   - Provide a `unity` inspector button (via `[ContextMenu]`) on `FishPollingController` to trigger a manual fetch while in play mode for debugging.
   - Optionally add a `ScriptableObject` fixture to supply canned JSON for offline testing.

## Testing & Validation
- **Edit Mode**
  - `FishRepositoryTests`: verify `ApplyPayload` handles add/update/remove, respects TTL, and returns consistent snapshots.
  - `FishPollingControllerTests`: use a fake HTTP layer (injectable delegate) to simulate success/failure, ensuring intervals/backoff behave as expected.
- **Play Mode**
  - With staging backend or mock server, confirm fish spawn without duplicate instantiation while toggling connection.
- Fixtures should live under `Assets/Tests/TestData/Fish/*` including JSON payloads and color edge cases.

## Dependencies
- Requires Task 1 bootstrap to provide `AppConfig`, `FishRepository`, and `TelemetryLogger` references.
- Unblocks Task 3 (spawner listens to repository events) and Task 5 (telemetry event definitions).

## Risks & Mitigations
- **Network Latency Spikes**: ensure polling coroutine yields between retries so main thread stays responsive.
- **JSON Changes**: guard parsing with basic validation; log unexpected fields but continue using defaults.
- **Time Drift**: rely on backend timestamps rather than client time when determining TTL; convert ISO strings with `DateTime.Parse` using `DateTimeStyles.AdjustToUniversal`.
