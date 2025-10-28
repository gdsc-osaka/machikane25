using System.Collections;
using Art.App;
using Art.Fish;
using Art.Telemetry;
using UnityEngine;

namespace Art.Rare
{
    public sealed class RareCharacterController : MonoBehaviour
    {
        private AppConfig config;
        private FishSpawner spawner;
        private TelemetryLogger telemetry;
        private bool initialized;

        public void Initialize(AppConfig cfg, FishSpawner fishSpawner, TelemetryLogger telemetryLogger)
        {
            config = cfg;
            spawner = fishSpawner;
            telemetry = telemetryLogger;
            initialized = true;
        }

        public IEnumerator Run()
        {
            if (!initialized || config == null)
            {
                yield break;
            }

            while (enabled)
            {
                yield return new WaitForSeconds(Mathf.Max(1f, config.rareSpawnCooldownSeconds));

                try
                {
                    EvaluateRareSpawn();
                }
                catch (System.Exception ex)
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

            var roll = Random.value;
            if (roll <= config.rareSpawnChance)
            {
                telemetry?.LogInfo("Triggering rare character spawn.");
                // Hook for spawning special characters implemented in a later task.
            }
        }
    }
}
