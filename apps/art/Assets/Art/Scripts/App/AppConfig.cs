using UnityEngine;

namespace Art.App
{
    [CreateAssetMenu(menuName = "Art/App Config", fileName = "AppConfig")]
    public sealed class AppConfig : ScriptableObject
    {
        public enum PollingMode
        {
            Backend,
            MockOffline
        }

        [Header("Backend")]
        public string backendUrl;
        public string apiKey;

        [Header("Polling")]
        [Tooltip("Default cadence between fish polling requests in seconds.")]
        public float pollIntervalSeconds = 30f;
        [Tooltip("Lower bound for adaptive polling cadence in seconds.")]
        public float minPollIntervalSeconds = 15f;
        [Tooltip("Upper bound for adaptive polling cadence in seconds.")]
        public float maxPollIntervalSeconds = 60f;
        [Tooltip("Seconds before locally cached fish data expires.")]
        public float fishTtlSeconds = 120f;
        [Tooltip("Selects the data source for fish polling.")]
        public PollingMode pollingMode = PollingMode.Backend;

        [Header("Rare Characters")]
        [Tooltip("Probability (0-1) that a rare character spawn is scheduled when evaluated.")]
        [Range(0f, 1f)]
        public float rareSpawnChance = 0.05f;
        [Tooltip("Minimum seconds between rare character spawn evaluations.")]
        public float rareSpawnCooldownSeconds = 300f;

        [Header("Telemetry")]
        public string sentryDsn;

        [Header("Visitor Detection")]
        [Tooltip("Polling cadence for visitor detector updates in seconds.")]
        public float visitorDetectionIntervalSeconds = 0.5f;

        private void OnValidate()
        {
            if (pollIntervalSeconds < 0f)
            {
                pollIntervalSeconds = 0f;
            }

            if (minPollIntervalSeconds < 0f)
            {
                minPollIntervalSeconds = 0f;
            }

            if (maxPollIntervalSeconds < minPollIntervalSeconds)
            {
                maxPollIntervalSeconds = minPollIntervalSeconds;
            }

            if (fishTtlSeconds < 0f)
            {
                fishTtlSeconds = 0f;
            }

            if (rareSpawnCooldownSeconds < 0f)
            {
                rareSpawnCooldownSeconds = 0f;
            }

            if (visitorDetectionIntervalSeconds < 0.1f)
            {
                visitorDetectionIntervalSeconds = 0.1f;
            }
        }
    }
}
