# Task 2: Fish Polling & Repository

## Objective
Implement the data ingestion layer that polls the backend for fish metadata, diffs it against cached entries, and surfaces domain events for prefab management.

## Scope
- Create `IFishApiClient` implementation backed by `UnityWebRequest` with API key header, retry logic, and cadence adaptation (15–60s clamp).
- Implement `FishPollingService` coroutine that fetches fish payloads and computes added/updated/expired deltas.
- Build `FishRepository` to hold current fish state, publish events (`FishAdded`, `FishUpdated`, `FishExpired`), and enforce TTL alignment with Firestore.
- Normalise DTOs to domain models (`FishData`, `FishState`) reflecting architecture guidance.

## Deliverables
- Concrete `FishApiClient` handling HTTP calls, error reporting, and JSON parsing.
- `FishPollingService` with configurable cadence and exponential backoff on failure; raises Sentry alerts after repeated errors.
- `FishRepository` with domain events consumable by the spawner layer, including unit tests covering diff logic and TTL behaviour.
- Serialization helpers / DTOs that model the backend schema (`id`, `imageUrl`, `color`, `createdAt`).

## Implementation Steps
1. Model fish DTOs and domain types under `Assets/Art/Scripts/Domain/Fish`.
2. Implement the HTTP client and ensure it reads configuration from `AppConfig`.
3. Create `FishRepository` with event handlers; include ability to seed initial state for testing.
4. Write `FishPollingService` coroutine that runs on `AppRoot`, processes API responses, updates the repository, and reschedules itself.
5. Add edit-mode tests validating diff logic, TTL expiry, and error handling paths.

## Dependencies & Notes
- Depends on Task 1 for interfaces, configuration assets, and registry wiring.
- Downstream `FishSpawner` (Task 3) and telemetry (Task 5) rely on repository events and error signalling.
- Consider thread-safety with Unity main thread; keep repository mutations on the main thread to avoid race conditions.
