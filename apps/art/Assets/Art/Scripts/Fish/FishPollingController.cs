using System.Collections;
using Art.App;
using Art.Telemetry;
using UnityEngine;

namespace Art.Fish
{
    public sealed class FishPollingController : MonoBehaviour
    {
        private AppConfig config;
        private FishRepository repository;
        private TelemetryLogger telemetry;
        private float currentInterval;
        private bool isInitialized;

        public void Initialize(AppConfig cfg, FishRepository repo, TelemetryLogger telemetryLogger)
        {
            config = cfg;
            repository = repo;
            telemetry = telemetryLogger;
            currentInterval = Mathf.Clamp(cfg.pollIntervalSeconds, cfg.minPollIntervalSeconds, cfg.maxPollIntervalSeconds);
            isInitialized = true;
        }

        public IEnumerator Run()
        {
            if (!isInitialized)
            {
                yield break;
            }

            while (enabled && config != null)
            {
                yield return FetchOnce();
                yield return new WaitForSeconds(GetWaitInterval());
            }
        }

        private IEnumerator FetchOnce()
        {
            try
            {
                // UnityWebRequest logic goes here (Task 2 expands this).
                ResetInterval();
            }
            catch (System.Exception ex)
            {
                telemetry?.LogException("Fish polling encountered an exception.", ex);
                BackoffInterval();
            }

            yield break;
        }

        private float GetWaitInterval()
        {
            if (config == null)
            {
                return currentInterval;
            }

            return Mathf.Clamp(currentInterval, config.minPollIntervalSeconds, config.maxPollIntervalSeconds);
        }

        private void ResetInterval()
        {
            if (config == null)
            {
                return;
            }

            currentInterval = Mathf.Clamp(config.pollIntervalSeconds, config.minPollIntervalSeconds, config.maxPollIntervalSeconds);
        }

        private void BackoffInterval()
        {
            if (config == null)
            {
                return;
            }

            var increased = currentInterval * 1.5f;
            currentInterval = Mathf.Clamp(increased, config.minPollIntervalSeconds, config.maxPollIntervalSeconds);
        }
    }
}
