# Task 3: Fish Spawning & Texture Pipeline

## Objective
Handle spawning, updating, and retiring fish prefabs in the scene while fetching textures from Firebase Storage and applying colour data.

## Scope
- Implement `FishSpawner` that subscribes to repository events and manages prefab lifecycle (instantiate, update materials, despawn).
- Create `IFishTextureClient` to download textures asynchronously, cache them in `Application.persistentDataPath`, and reuse across fish instances.
- Apply hue information extracted from backend data to material properties to achieve the visual style described in the design doc.
- Integrate spawner output with `SchoolCoordinator` so new fish join the boids simulation smoothly.

## Deliverables
- Prefab management system capable of reusing pooled objects where possible to avoid GC spikes.
- Texture client with disk caching, retry strategy, and guardrails against hammering Storage.
- Material update path that blends downloaded textures with hue highlighting (document shader expectations if custom).
- Play mode smoke test verifying fish spawn/update/despawn flows with stubbed texture downloads.

## Implementation Steps
1. Define fish prefab contracts (required components, material references) and document placement under `Assets/Art/Fish`.
2. Implement texture client with caching and integration into `ServiceRegistry`.
3. Build `FishSpawner` to respond to repository events and manage prefab instances; include pooling if time permits.
4. Hook spawned fish into `SchoolCoordinator`, ensuring transforms and controllers initialise correctly.
5. Add play mode test or in-editor validation scene demonstrating spawn/update/despawn behaviour.

## Dependencies & Notes
- Depends on Tasks 1 and 2 for service registry, repository, and domain events.
- Coordinates with Task 4 to ensure boids controllers accept new fish at runtime.
- Performance considerations: move PNG decode off the main thread if it becomes a bottleneck (track in follow-up issues).
