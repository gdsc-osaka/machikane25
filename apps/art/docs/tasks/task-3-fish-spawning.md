# Task 3: Fish Spawning & Texture Pipeline

## Architectural Context
Maps to `Architecture.md` sections **Runtime Data Flow**, **Core Components** (`FishSpawner`, `FishTextureCache`, `SchoolCoordinator`), and **Texture Pipeline**. This task ensures fish emitted by the repository appear in the scene with correct textures, colours, and boids behaviour.

## Directory & Asset Layout
- `Assets/Art/Scripts/Fish/`
  - `FishSpawner.cs`
  - `FishAgent.cs` (per-fish MonoBehaviour controlling visuals/boid hooks).
  - `FishTextureCache.cs`
  - `FishMaterialApplicator.cs` (optional helper).
- `Assets/Art/Scripts/Presentation/Schools/`
  - `SchoolCoordinator.cs` (already present, may require extension).
  - `BoidSettings.cs` ScriptableObject for tunable parameters.
- `Assets/Art/Fish/`
  - Prefabs (e.g., `Fish_Default.prefab`, `Fish_Rare.prefab`) with paired `.meta`.
  - Materials and shaders used to blend hue/texture.
- Tests:
  - `Assets/Art/Tests/PlayMode/Fish/FishSpawnerPlayTests.cs`
  - `Assets/Art/Tests/EditMode/Fish/FishTextureCacheTests.cs`

## Key Behaviours & Helpers
```csharp
// Assets/Art/Scripts/Fish/FishSpawner.cs
public sealed class FishSpawner : MonoBehaviour
{
    [SerializeField] private FishRepository repository;
    [SerializeField] private FishTextureCache textureCache;
    [SerializeField] private SchoolCoordinator schoolCoordinator;
    [SerializeField] private FishDefinition defaultDefinition;
    [SerializeField] private Transform fishParent;

    private readonly Dictionary<string, FishAgent> activeAgents = new();
    private TelemetryLogger telemetry;

    public void Initialize(FishRepository repo, TelemetryLogger telemetryLogger)
    {
        repository = repo;
        telemetry = telemetryLogger;
        Subscribe();
    }

    private void Subscribe()
    {
        repository.FishAdded += HandleFishAdded;
        repository.FishUpdated += HandleFishUpdated;
        repository.FishRemoved += HandleFishRemoved;
    }
}
```

```csharp
// Assets/Art/Scripts/Fish/FishTextureCache.cs
public sealed class FishTextureCache
{
    private readonly string cacheRoot;
    private readonly Dictionary<string, Texture2D> runtimeCache = new();

    public FishTextureCache(string cacheRootPath)
    {
        cacheRoot = cacheRootPath;
    }

    public async Task<Texture2D> LoadAsync(string imageUrl, TelemetryLogger telemetry)
    {
        if (runtimeCache.TryGetValue(imageUrl, out var texture))
        {
            return texture;
        }

        var localPath = GetLocalPath(imageUrl);
        if (File.Exists(localPath))
        {
            var data = await File.ReadAllBytesAsync(localPath);
            texture = new Texture2D(2, 2);
            texture.LoadImage(data);
        }
        else
        {
            using var request = UnityWebRequestTexture.GetTexture(imageUrl);
            await request.SendWebRequest();
            texture = DownloadHandlerTexture.GetContent(request);
            Directory.CreateDirectory(Path.GetDirectoryName(localPath)!);
            await File.WriteAllBytesAsync(localPath, texture.EncodeToPNG());
        }

        runtimeCache[imageUrl] = texture;
        return texture;
    }
}
```

```csharp
// Assets/Art/Scripts/Fish/FishAgent.cs
public sealed class FishAgent : MonoBehaviour
{
    [SerializeField] private Renderer bodyRenderer;
    [SerializeField] private Animator animator;

    public void ApplyState(FishState state, Texture2D texture)
    {
        var material = bodyRenderer.material;
        material.SetTexture("_MainTex", texture);
        material.SetColor("_Tint", state.Tint);
    }
}
```

## Detailed Logic
1. **Repository Subscription**
   - During `Initialize`, `FishSpawner` subscribes to `FishRepository` events. Ensure `OnDestroy` unsubscribes to avoid leaks.
   - Maintain `Dictionary<string, FishAgent>` to track active fish by ID.

2. **Spawning Flow**
   - When `FishAdded` fires:
     - Choose prefab (`defaultDefinition` or variant based on metadata).
     - Instantiate under `fishParent` transform; assign unique name (`Fish_{id}`).
     - Create or reuse a `FishAgent` component and register with `SchoolCoordinator.AddAgent`.
     - Kick off async texture load via `StartCoroutine(ApplyTexture(state))`.

3. **Texture Application**
   - `FishTextureCache` runs in plain C#; instantiate once (e.g., in `FishSpawner.Awake`) with `Path.Combine(Application.persistentDataPath, "FishTextures")`.
   - While texture loads, show placeholder material/hue.
   - Ensure final texture assignment occurs on main thread (`await`ed tasks can resume on Unity main thread using `UniTask` or coroutine wrappers).
   - Handle errors by logging via `telemetry.LogException` and leaving placeholder texture.

4. **Updates & Removals**
   - `FishUpdated`: update tint and check if image URL changed; if so, reload texture.
   - `FishRemoved`: remove from `activeAgents`, call `SchoolCoordinator.RemoveAgent`, and either disable GameObject for pooling or destroy (`Destroy(agent.gameObject)`).

5. **Pooling (Optional)**
   - Maintain inactive queue per prefab type for reuse. Keep simple for now; pooling can be a follow-up if GC spikes observed.

6. **Hue Application**
   - Use helper `FishPalette.ApplyHue(Material material, Color tint)` to keep conversion consistent with Task 2.
   - Document required shader properties (`_MainTex`, `_Tint`) in prefab README.

7. **Boids Integration**
   - When new agent spawns, call `schoolCoordinator.RegisterAgent(fishAgent)`; the coordinator handles behaviour in Task 4.
   - Provide `FishAgent.Initialize(BoidSettings settings)` to set separation/alignment weights.

8. **Instrumentation**
   - Log spawn/update/despawn counts per poll cycle via `telemetry.LogEvent("fish_spawn_cycle", new { added, updated, removed })`.
   - Provide gizmo debug (optional) to visualise fish origins when debugging alignment.

## Testing & Validation
- **Edit Mode**
  - `FishTextureCacheTests` confirming cache reuse, disk save/load, and error handling for invalid URLs.
- **Play Mode**
  - Simulated repository events (manual scriptable fixture) verifying spawn pipeline updates materials and registers with `SchoolCoordinator`.
  - Toggle connectivity to confirm fish persist using cached textures when offline.

## Dependencies
- Requires Task 1 (AppRoot wiring) and Task 2 (repository events populated).
- Shares telemetry and configuration assumptions with Task 5.
- Task 4 will extend `SchoolCoordinator` to react to visitor detections; ensure registration API stays stable.

## Risks & Mitigations
- **Texture Download Latency**: use placeholder visuals and log durations; consider prefetching high-priority fish.
- **Memory Usage**: release textures when fish removed if cache grows too large; optionally implement LRU eviction.
- **Shader Compatibility**: confirm target materials expose `_Tint`; document requirement for art team.
