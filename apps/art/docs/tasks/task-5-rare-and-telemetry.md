# Task 5: Rare Characters & Telemetry

## Objective
Deliver the rare-character experience and ensure runtime telemetry flows to Sentry so operational issues surface quickly.

## Scope
- Implement `RareCharacterService` that schedules rare spawns (≈1% chance per interval), manages their lifecycle, and coordinates with `FishSpawner`.
- Create visual and audio hooks for rare characters, ensuring they layer cleanly over existing fish without disrupting the school.
- Integrate Sentry SDK for Unity, wiring it through the `TelemetryService` defined in Task 1.
- Capture structured events for key flows: successful fish poll, polling failure, texture download error, rare character spawn.

## Deliverables
- Configurable rare spawn odds and presentation assets (placeholder OK pending art direction).
- Lifecycle hooks so rare characters can be spawned, updated, and culled independently from standard fish.
- Telemetry pipeline with context enrichment (API latency, texture cache hits, visitor detection status).
- Documentation snippet describing how to view Sentry events for the renderer.

## Implementation Steps
1. Model rare character definitions (prefabs/materials/audio) and expose them via ScriptableObjects.
2. Implement `RareCharacterService` coroutine that uses random scheduling, requests spawns through `FishSpawner`, and enforces cooldowns.
3. Add `TelemetryService` implementation that forwards logs, breadcrumbs, and exceptions to Sentry using config values.
4. Emit telemetry events from polling, texture, visitor, and rare-character flows; ensure failures trigger alerts.
5. Validate integration in play mode, confirming Sentry receives test events (use staging DSN).

## Dependencies & Notes
- Depends on Tasks 1–3 for service interfaces and spawner integration; ties into Task 4 for visitor-aware behaviours.
- Coordinate with art/audio teams for final rare-character assets.
- Be mindful of privacy requirements—avoid sending PII in telemetry payloads.
