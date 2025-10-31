using Art.App;
using Art.Fish;
using Art.Telemetry;
using System;
using System.Collections;
using System.Linq;
using UnityEngine;

namespace Art.Rare
{
    /// <summary>
    /// Schedules rare character spawns at intervals with weighted random selection.
    /// Ensures only one rare character is active at a time.
    /// </summary>
    public sealed class RareCharacterController : MonoBehaviour
    {
        [Header("Rare Character Definitions")]
        [SerializeField] private RareCharacterDefinition[] definitions;

        private AppConfig config;
        private FishSpawner spawner;
        private TelemetryLogger telemetry;
        private bool initialized;
        private GameObject currentRareInstance;
        private Coroutine despawnRoutine;

        // For testing purposes, allow seeding the random number generator
        private System.Random random;

        public void Initialize(AppConfig cfg, FishSpawner fishSpawner, TelemetryLogger telemetryLogger)
        {
            Initialize(cfg, fishSpawner, telemetryLogger, new System.Random());
        }

        /// <summary>
        /// Initialize with a specific random instance (useful for deterministic testing).
        /// </summary>
        public void Initialize(AppConfig cfg, FishSpawner fishSpawner, TelemetryLogger telemetryLogger, System.Random randomInstance)
        {
            config = cfg;
            spawner = fishSpawner;
            telemetry = telemetryLogger;
            random = randomInstance ?? new System.Random();
            initialized = true;
        }

        private void OnDestroy()
        {
            DespawnCurrentRare();
        }

        public IEnumerator Run()
        {
            if (!initialized || config == null)
            {
                telemetry?.LogWarning("RareCharacterController not initialized or missing config.");
                yield break;
            }

            while (enabled)
            {
                yield return new WaitForSeconds(Mathf.Max(1f, config.rareSpawnCooldownSeconds));

                try
                {
                    EvaluateRareSpawn();
                }
                catch (Exception ex)
                {
                    telemetry?.LogException("Rare character evaluation failed.", ex);
                }
            }
        }

        private void EvaluateRareSpawn()
        {
            if (config == null || spawner == null)
            {
                return;
            }

            if (definitions == null || definitions.Length == 0)
            {
                telemetry?.LogWarning("RareCharacterController has no definitions.");
                return;
            }

            // Log evaluation event
            telemetry?.LogEvent(TelemetryEvents.RareEvaluated, new { chance = config.rareSpawnChance });

            // Check if we should spawn based on probability
            var roll = random.NextDouble();
            if (roll > config.rareSpawnChance)
            {
                return;
            }

            // Only one rare character at a time
            if (currentRareInstance != null)
            {
                telemetry?.LogInfo("Rare character already active, skipping spawn.");
                return;
            }

            // Pick a rare character using weighted selection
            var definition = PickWeightedDefinition();
            if (definition == null || definition.prefab == null)
            {
                telemetry?.LogWarning("Failed to select valid rare character definition.");
                return;
            }

            SpawnRareCharacter(definition);
        }

        private RareCharacterDefinition PickWeightedDefinition()
        {
            if (definitions == null || definitions.Length == 0)
            {
                return null;
            }

            // Filter out null definitions and those with zero weight
            var validDefinitions = definitions.Where(d => d != null && d.weight > 0f).ToArray();
            if (validDefinitions.Length == 0)
            {
                return null;
            }

            // Calculate total weight
            var totalWeight = 0f;
            foreach (var def in validDefinitions)
            {
                totalWeight += def.weight;
            }

            if (totalWeight <= 0f)
            {
                // If all weights are zero, pick randomly
                return validDefinitions[random.Next(validDefinitions.Length)];
            }

            // Weighted random selection
            var roll = random.NextDouble() * totalWeight;
            var cumulativeWeight = 0f;

            foreach (var def in validDefinitions)
            {
                cumulativeWeight += def.weight;
                if (roll <= cumulativeWeight)
                {
                    return def;
                }
            }

            // Fallback (should not reach here, but return last definition if we do)
            return validDefinitions[validDefinitions.Length - 1];
        }

        private void SpawnRareCharacter(RareCharacterDefinition definition)
        {
            if (definition == null || definition.prefab == null)
            {
                return;
            }

            try
            {
                // Instantiate the rare character prefab
                currentRareInstance = Instantiate(definition.prefab, transform);
                currentRareInstance.name = $"RareCharacter_{definition.name}";

                // Play spawn sound effect if available
                if (definition.spawnSfx != null)
                {
                    AudioSource.PlayClipAtPoint(definition.spawnSfx, Camera.main?.transform.position ?? Vector3.zero);
                }

                // Log telemetry event
                telemetry?.LogEvent(TelemetryEvents.RareSpawned, new
                {
                    definition = definition.name,
                    attractorStrength = definition.attractorStrength,
                    lifetime = definition.lifetimeSeconds
                });

                // Schedule despawn if lifetime is set
                if (definition.lifetimeSeconds > 0f)
                {
                    if (despawnRoutine != null)
                    {
                        StopCoroutine(despawnRoutine);
                    }

                    despawnRoutine = StartCoroutine(DespawnAfterDelay(definition.lifetimeSeconds));
                }

                // Notify FishSpawner about rare character spawn
                // This allows the spawner to treat it specially (e.g., as an attractor)
                spawner?.SpawnRare(definition);
            }
            catch (Exception ex)
            {
                telemetry?.LogException($"Failed to spawn rare character: {definition.name}", ex);
                currentRareInstance = null;
            }
        }

        private IEnumerator DespawnAfterDelay(float delay)
        {
            yield return new WaitForSeconds(delay);
            DespawnCurrentRare();
        }

        private void DespawnCurrentRare()
        {
            if (currentRareInstance != null)
            {
                telemetry?.LogInfo($"Despawning rare character: {currentRareInstance.name}");

                if (Application.isPlaying)
                {
                    Destroy(currentRareInstance);
                }
                else
                {
                    DestroyImmediate(currentRareInstance);
                }

                currentRareInstance = null;
            }

            if (despawnRoutine != null)
            {
                StopCoroutine(despawnRoutine);
                despawnRoutine = null;
            }
        }

#if UNITY_EDITOR
        [ContextMenu("Force Spawn Rare Character")]
        private void ForceSpawnRare()
        {
            if (!initialized)
            {
                Debug.LogWarning("RareCharacterController not initialized.");
                return;
            }

            if (definitions == null || definitions.Length == 0)
            {
                Debug.LogWarning("No rare character definitions available.");
                return;
            }

            var definition = PickWeightedDefinition();
            if (definition != null)
            {
                SpawnRareCharacter(definition);
            }
        }

        [ContextMenu("Despawn Current Rare")]
        private void ForceDespawn()
        {
            DespawnCurrentRare();
        }
#endif
    }
}