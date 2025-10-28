# Task 4: Visitor Detection & School Coordination

## Objective
Detect visitor presence near the projection using OpenCVSharp, translate detections into scene coordinates, and use them to steer the boids simulation.

## Scope
- Integrate OpenCVSharp native plugins for macOS/Linux kiosks and verify webcam capture in Unity.
- Implement `VisitorDetectionService` that runs background processing (background subtraction, contour detection, centroid grouping).
- Convert camera-space centroids to aquarium screen coordinates, handling calibration offsets.
- Extend `SchoolCoordinator` (or associated controllers) to accept visitor attractors and adjust boids goals accordingly.

## Deliverables
- Webcam capture pipeline with adjustable resolution/frame rate to balance performance.
- Detection service exposing visitor group centroids (with smoothing) and emitting updates consumable by presentation layer.
- Calibration tooling or inspector UI for mapping camera coordinates to world space (documented workflow for event setup team).
- Play mode test or diagnostic scene showing fish aggregating near mocked visitor positions.

## Implementation Steps
1. Configure OpenCVSharp dependencies in the project and document build steps (README + plugin folder layout).
2. Implement detection service using HSV filtering, contour grouping, and centroid extraction per design doc guidance.
3. Provide calibration script/inspector to align camera feed with projection plane; persist settings in `AppConfig` or dedicated asset.
4. Update `SchoolCoordinator` to accept visitor attractors and weight them against existing boids behaviours.
5. Create debugging overlay (optional) to visualise detections during setup.

## Dependencies & Notes
- Depends on Task 1 for service registry context and Task 3 for fish controllers reacting to school updates.
- Coordinate with Task 5 to surface detection errors to telemetry (e.g., camera offline).
- Risk: native plugin configuration—plan early integration tests on kiosk hardware.
