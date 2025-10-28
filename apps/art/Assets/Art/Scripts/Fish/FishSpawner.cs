using Art.Telemetry;
using UnityEngine;

namespace Art.Fish
{
    public sealed class FishSpawner : MonoBehaviour
    {
        private FishRepository repository;
        private FishTextureCache textureCache;
        private TelemetryLogger telemetry;
        private bool initialized;

        public void Initialize(FishRepository repo, FishTextureCache cache, TelemetryLogger telemetryLogger)
        {
            TeardownSubscriptions();

            repository = repo;
            textureCache = cache;
            telemetry = telemetryLogger;

            if (repository != null)
            {
                repository.FishAdded += HandleFishAdded;
                repository.FishUpdated += HandleFishUpdated;
                repository.FishRemoved += HandleFishRemoved;
            }
            else
            {
                Debug.LogWarning("FishSpawner initialized without a FishRepository reference.", this);
            }

            if (textureCache == null)
            {
                Debug.LogWarning("FishSpawner initialized without a FishTextureCache reference.", this);
            }

            initialized = repository != null && textureCache != null;
        }

        private void OnDestroy()
        {
            TeardownSubscriptions();
        }

        private void HandleFishAdded(FishState fish)
        {
            if (!initialized || fish == null)
            {
                return;
            }

            telemetry?.LogInfo($"Spawning fish {fish.Id}");
            // Prefab instantiation and texture assignment implemented in a later task.
        }

        private void HandleFishUpdated(FishState fish)
        {
            if (!initialized || fish == null)
            {
                return;
            }

            telemetry?.LogInfo($"Updating fish {fish.Id}");
        }

        private void HandleFishRemoved(string fishId)
        {
            if (!initialized || string.IsNullOrEmpty(fishId))
            {
                return;
            }

            telemetry?.LogInfo($"Despawning fish {fishId}");
        }

        private void TeardownSubscriptions()
        {
            if (repository != null)
            {
                repository.FishAdded -= HandleFishAdded;
                repository.FishUpdated -= HandleFishUpdated;
                repository.FishRemoved -= HandleFishRemoved;
            }

            initialized = false;
        }
    }
}