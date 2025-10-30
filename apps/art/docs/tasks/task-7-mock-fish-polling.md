# Task 7: Mock Fish Polling Mode

## Architectural Context
Extends the polling pipeline described in `Architecture.md` under **Runtime Data Flow**, **Core Components**, and **Interim Mock Polling Mode** so the aquarium can run without the backend. Introduces provider abstraction for fish data and a ScriptableObject-backed mock that preserves repository semantics while developers spin up live services.

## Directory & Asset Layout
- `Assets/Art/Scripts/Fish/`
  - `IFishDataProvider.cs`
  - `HttpFishDataProvider.cs` (existing logic extracted from `FishPollingController`)
  - `MockFishDataProvider.cs`
- `Assets/Art/Scripts/Fish/Editor/`
  - `MockFishDatasetEditor.cs` (optional inspector tooling)
- `Assets/Art/Configs/`
  - `MockFishDataset.asset` (one or more fixtures)
- `Assets/Art/Scripts/App/AppConfig.cs` (+ serialized `pollingMode` enum)
- `Assets/Art/Scripts/App/AppRoot.cs` (provider wiring)
- Tests:
  - `Assets/Art/Tests/EditMode/Fish/MockFishDataProviderTests.cs`
  - `Assets/Art/Tests/EditMode/Fish/FishPollingControllerProviderTests.cs`
  - Static payloads in `Assets/Tests/TestData/Fish/Mock/*.json`

## Key Types & Interfaces
```csharp
// Assets/Art/Scripts/Fish/IFishDataProvider.cs
public interface IFishDataProvider
{
    string SourceTag { get; }
    IEnumerator Fetch(FishDataProviderContext context);
}
```

```csharp
// Assets/Art/Scripts/Fish/HttpFishDataProvider.cs
public sealed class HttpFishDataProvider : IFishDataProvider
{
    public string SourceTag => "backend";
    // moves UnityWebRequest logic from FishPollingController into Fetch()
}
```

```csharp
// Assets/Art/Scripts/Fish/MockFishDataProvider.cs
[CreateAssetMenu(menuName = "Art/Fish/Mock Fish Data Provider")]
public sealed class MockFishDataProvider : ScriptableObject, IFishDataProvider
{
    [SerializeField] private MockFishDataset dataset;
    [SerializeField] private Vector2 latencyRangeMs = new(250, 750);
    public string SourceTag => "mock";

    public IEnumerator Fetch(FishDataProviderContext context) { ... }
}
```

```csharp
// Assets/Art/Scripts/Fish/MockFishDataset.cs
[CreateAssetMenu(menuName = "Art/Fish/Mock Dataset")]
public sealed class MockFishDataset : ScriptableObject
{
    public List<MockFishEntry> entries = new();
}

[Serializable]
public struct MockFishEntry
{
    public string id;
    public Texture2D texture;
    public Color tint;
    public DateTime createdAt;
}
```

```csharp
// Assets/Art/Scripts/Fish/FishDataProviderContext.cs
public readonly struct FishDataProviderContext
{
    public FishDataProviderContext(AppConfig config, FishRepository repo, TelemetryLogger telemetry, Action<IReadOnlyList<FishState>> onSuccess, Action<FishPollFailure> onFailure) { ... }
}
```

## Detailed Logic
1. **Provider Abstraction**
   - Introduce `IFishDataProvider` and move all data acquisition out of `FishPollingController`.
   - `FishPollingController` keeps cadence, backoff, telemetry, and calls `provider.Fetch(context)` each cycle.
   - `FishDataProviderContext` supplies references to `AppConfig`, `FishRepository`, `TelemetryLogger`, and callback delegates.

2. **HTTP Provider Extraction**
   - Create `HttpFishDataProvider` applying the existing UnityWebRequest logic, emitting results via the context callbacks.
   - Preserve error handling, telemetry events (`fish_poll_success` / `fish_poll_failed`), and exponential backoff data.

3. **Mock Provider**
   - `MockFishDataProvider` reads fish entries from `MockFishDataset`, converts them to `FishState`, and invokes `context.OnSuccess`.
   - Support optional variations: randomize tint jitter, rotate subsets, and simulate network latency via `yield return new WaitForSeconds`.
   - Ensure repository TTL and diff paths execute identically to live data (no shortcuts).

4. **Configuration Toggle**
   - Extend `AppConfig` with `public PollingMode pollingMode` (`Backend`, `MockOffline`).
   - `AppRoot` selects the provider at runtime: default to HTTP, swap to mock when configured.
   - Provide a `[ContextMenu("Switch Polling Mode")]` helper for designers to hot-swap while in the editor.

5. **Telemetry & Logging**
   - Tag telemetry events with `source = provider.SourceTag`.
  - When mock mode is active, log a single warning on startup so operators know the build is non-production.

6. **Editor Support**
   - Optional custom inspector for `MockFishDataset` to add entries quickly and preview textures.
   - Validate entries (non-empty IDs, textures assigned) and surface warnings in the inspector.

## Testing & Validation
- **Edit Mode**
  - `MockFishDataProviderTests`: confirm deterministic payload emission, latency delay, and randomization bounds.
  - `FishPollingControllerProviderTests`: use test doubles to assert provider selection based on `AppConfig.pollingMode`, success/failure callbacks, and telemetry tagging.
  - `AppRootProviderTests` (optional): verify provider wiring when toggling modes.
- **Play Mode**
  - Enter play mode with mock dataset to ensure fish spawn, textures apply, and repository diffing works across multiple frames.
- Fixtures in `Assets/Tests/TestData/Fish/Mock/` should mirror real backend payloads so switching providers is transparent.

## Dependencies
- Builds upon Tasks 1–3 so `AppConfig`, `FishPollingController`, and `FishRepository` exist.
- Requires telemetry helpers from Task 5 for consistent logging.
- Unlocks kiosk dry runs without backend availability and unblocks QA scenarios relying on deterministic fish states.

## Risks & Mitigations
- **Config Drift**: ensure new enum defaults to `Backend`; add build-time validation to prevent shipping mock mode unintentionally.
- **ScriptableObject Sync**: provide `MockFishDataset` examples and document editing flow to avoid missing texture references.
- **Test Fragility**: keep provider tests focused on behaviour, not implementation details, so refactors to polling loops don't break mocks.
