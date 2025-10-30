# Task 4: Visitor Detection & School Coordination

## Architectural Context
Expands the visitor-sensing loop described in `Architecture.md` under **Runtime Data Flow**, **Core Components** (`VisitorDetector`, `SchoolCoordinator`), and **Visitor Detection Pipeline**. The goal is to read webcam input, derive visitor centroids, and feed attractors into the boids system.

## Directory & Asset Layout
- `Assets/Art/Scripts/Visitors/`
  - `VisitorDetector.cs`
  - `VisitorGroup.cs` (data struct holding centroid + magnitude).
  - `CameraCalibration.cs` (ScriptableObject storing homography/offset data).
  - `VisitorDetectionDebugger.cs` (optional gizmo overlay).
- `Assets/Art/Scripts/Presentation/Schools/`
  - `SchoolCoordinator.cs` (extend with visitor influence).
  - `VisitorInfluenceSettings.cs` ScriptableObject for tuning weighting and falloff.
- `Assets/Art/Plugins/OpenCVSharp/` (native binaries per platform).
- `Assets/Art/UI/VisitorDebugCanvas.prefab` (toggleable overlay).
- Tests:
  - `Assets/Art/Tests/EditMode/Visitors/VisitorDetectorTests.cs`
  - `Assets/Art/Tests/PlayMode/Visitors/VisitorInfluenceTests.cs`

## Key Components
```csharp
// Assets/Art/Scripts/Visitors/VisitorDetector.cs
public sealed class VisitorDetector : MonoBehaviour
{
    [SerializeField] private CameraCalibration calibration;
    [SerializeField] private int targetWidth = 640;
    [SerializeField] private int targetHeight = 360;
    [SerializeField] private float minContourArea = 800f;
    [SerializeField] private float mergeDistance = 0.2f; // in normalized space

    private WebCamTexture webcam;
    private TelemetryLogger telemetry;
    private readonly List<VisitorGroup> scratch = new();

    public event Action<IReadOnlyList<VisitorGroup>> OnVisitorsChanged;

    public void Initialize(AppConfig config, TelemetryLogger logger)
    {
        telemetry = logger;
    }

    public void StartDetection()
    {
        webcam = new WebCamTexture(targetWidth, targetHeight, 15);
        webcam.Play();
        StartCoroutine(ProcessLoop());
    }

    public void StopDetection()
    {
        StopAllCoroutines();
        if (webcam != null) { webcam.Stop(); Destroy(webcam); webcam = null; }
    }

    private IEnumerator ProcessLoop()
    {
        var backgroundSubtractor = new BackgroundSubtractorMOG2();
        while (enabled && webcam != null)
        {
            yield return new WaitForEndOfFrame();
            if (!webcam.didUpdateThisFrame) continue;
            DetectVisitors(webcam, backgroundSubtractor);
        }
    }
}
```

```csharp
// Assets/Art/Scripts/Visitors/CameraCalibration.cs
[CreateAssetMenu(menuName = "Art/Visitors/Camera Calibration")]
public sealed class CameraCalibration : ScriptableObject
{
    public Matrix4x4 homography;
    public Vector2 offset;
    public float scale = 1f;
}
```

```csharp
// Assets/Art/Scripts/Presentation/Schools/SchoolCoordinator.cs
public sealed partial class SchoolCoordinator : MonoBehaviour
{
    [SerializeField] private VisitorInfluenceSettings visitorInfluence;
    private readonly List<FishAgent> agents = new();
    private IReadOnlyList<VisitorGroup> currentVisitors = Array.Empty<VisitorGroup>();

    public void RegisterAgent(FishAgent agent) => agents.Add(agent);
    public void RemoveAgent(FishAgent agent) => agents.Remove(agent);

    public void ApplyVisitorInfluence(IReadOnlyList<VisitorGroup> visitors)
    {
        currentVisitors = visitors;
    }

    private void Update()
    {
        UpdateAgents();
    }
}
```

## Detailed Logic
1. **Webcam Setup**
   - Query `WebCamTexture.devices` to select the kiosk-facing camera (expose inspector dropdown or config string).
   - Target 640x360 @ 15 FPS to balance processing cost.
   - On `StartDetection`, instantiate `WebCamTexture`, call `Play`, and start the processing coroutine.

2. **Frame Processing**
   - Convert the latest frame to `Mat` using `OpenCvSharp.Unity.TextureToMat`.
   - Apply background subtraction (MOG2), Gaussian blur, and simple morphology (erode/dilate) to reduce noise.
   - Use `Cv2.FindContours` to locate blobs; filter by area (converted to screen-normalized units).
   - For each contour, compute centroid with `Cv2.Moments`.
   - Convert camera coordinates to screen/world coordinates using `calibration.homography` or a simpler offset/scale mapping depending on calibration complexity.

3. **Grouping & Smoothing**
   - Merge centroids closer than `mergeDistance` using a simple clustering loop (no need for full DBSCAN).
   - Track a rolling buffer of centroid positions (last ~5 frames) and apply exponential moving average to reduce jitter.
   - Emit `OnVisitorsChanged` with the smoothed list; if no visitors detected, send empty list.

4. **School Coordinator Integration**
   - Subscribe to `VisitorDetector.OnVisitorsChanged` in `AppRoot` or within `SchoolCoordinator`.
   - `SchoolCoordinator` should translate visitor positions into boid attractors:
     - For each `FishAgent`, compute steering vector toward nearest visitor.
     - Blend visitor force with existing separation/alignment/cohesion using weights from `VisitorInfluenceSettings`.
   - If visitors disappear, gradually decay influence to zero to avoid sudden snaps.

5. **Calibration Workflow**
   - Provide an editor window or inspector button that captures a still frame and allows technicians to mark reference points on screen to update `CameraCalibration`.
   - Persist calibration in the ScriptableObject so builds carry correct mapping.

6. **Telemetry & Error Handling**
   - On camera access failure, log via `telemetry.LogException("visitor_camera_init")` and show on-screen warning.
   - Record periodic stats (`visitor_detector_frame_time`, `visitor_count`) for monitoring performance.

7. **Debugging Aids**
   - `VisitorDetectionDebugger` draws gizmos or an overlay showing contours, centroids, and mapped positions when a debug flag is on.
   - Provide a toggle key (e.g., `F9`) to enable/disable overlay during setup.

## Testing & Validation
- **Edit Mode**
  - Use recorded image sequences (PNG frames) to validate contour detection, centroid mapping, and clustering logic.
  - Mock `CameraCalibration` to ensure coordinate conversion matches expected screen points.
- **Play Mode**
  - Run with a webcam or pre-recorded video using `VideoPlayer` feed to confirm fish congregate near simulated visitors.
  - Validate fallback path when camera unavailable (should log error but continue running).

## Dependencies
- Requires Task 1 (AppRoot wiring) to call `Initialize`/`StartDetection`.
- Interacts with Task 3’s `FishSpawner` via `SchoolCoordinator`.
- Task 5 will log detection metrics; expose simple hooks on `VisitorDetector` for telemetry calls.

## Risks & Mitigations
- **Native Plugin Setup**: verify OpenCVSharp libraries packaged under `Assets/Art/Plugins/OpenCVSharp/<platform>`. Document required Visual C++ runtime or lib dependencies.
- **Performance Drops**: keep frame resolution modest, and consider processing every other frame if CPU usage climbs.
- **Calibration Drift**: store calibration assets per venue; provide quick UI checklist for event technicians to recalibrate on-site.
