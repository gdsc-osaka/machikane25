using Art.App;
using Art.Telemetry;
using System;
using System.Collections;
using UnityEngine;

namespace Art.Fish
{
    public sealed class FishPollingController : MonoBehaviour
    {
        private const int FailureWarningThreshold = 3;

        private AppConfig config;
        private FishRepository repository;
        private TelemetryLogger telemetry;
        private IFishDataProvider dataProvider;
        private float defaultInterval;
        private float currentInterval;
        private int consecutiveFailures;
        private bool isInitialized;

        public void Initialize(AppConfig cfg, FishRepository repo, TelemetryLogger telemetryLogger, IFishDataProvider provider = null)
        {
            if (cfg == null)
            {
                throw new ArgumentNullException(nameof(cfg));
            }

            if (repo == null)
            {
                throw new ArgumentNullException(nameof(repo));
            }

            config = cfg;
            repository = repo;
            telemetry = telemetryLogger;
            dataProvider = provider ?? new HttpFishDataProvider();

            defaultInterval = ClampInterval(config.pollIntervalSeconds);
            currentInterval = defaultInterval;
            consecutiveFailures = 0;
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

        [ContextMenu("Fetch Now")]
        private void FetchNow()
        {
            if (!Application.isPlaying)
            {
                Debug.LogWarning("FishPollingController manual fetch only works in play mode.", this);
                return;
            }

            if (!isInitialized)
            {
                Debug.LogWarning("FishPollingController has not been initialized.", this);
                return;
            }

            StartCoroutine(FetchOnce());
        }

        private IEnumerator FetchOnce()
        {
            if (!isInitialized)
            {
                yield break;
            }

            if (dataProvider == null)
            {
                telemetry?.LogWarning("FishPollingController missing data provider; skipping fetch.");
                yield break;
            }

            FishDataProviderSuccess success = null;
            FishDataProviderFailure failure = null;
            IEnumerator fetchRoutine = null;

            try
            {
                var context = new FishDataProviderContext(
                    config,
                    telemetry,
                    result => success = result,
                    error => failure = error);

                fetchRoutine = dataProvider.Fetch(context);
            }
            catch (Exception ex)
            {
                telemetry?.LogException("Fish data provider threw during Fetch invocation.", ex);
                failure = new FishDataProviderFailure("provider_invocation_failed", 0f);
            }

            if (fetchRoutine != null)
            {
                yield return fetchRoutine;
            }

            if (success != null)
            {
                HandleSuccess(success);
                yield break;
            }

            if (failure != null)
            {
                HandleFailure(failure);
                yield break;
            }

            HandleFailure(new FishDataProviderFailure("provider_returned_no_result", 0f));
        }

        private void HandleSuccess(FishDataProviderSuccess success)
        {
            try
            {
                var diff = repository.ApplyPayload(success.States);
                consecutiveFailures = 0;
                currentInterval = defaultInterval;

                telemetry?.LogEvent(TelemetryEvents.FishPollSuccess, new
                {
                    source = dataProvider?.SourceTag ?? "unknown",
                    added = diff.Added.Count,
                    updated = diff.Updated.Count,
                    removed = diff.Removed.Count,
                    durationMs = success.DurationMs
                });

                // Add breadcrumb for debugging
                telemetry?.LogBreadcrumb("http", "Fish poll succeeded", new
                {
                    source = dataProvider?.SourceTag ?? "unknown",
                    fishCount = success.States?.Count ?? 0
                });
            }
            catch (Exception ex)
            {
                telemetry?.LogException("Fish polling payload processing failed.", ex);
                BackoffInterval();
            }
        }

        private void HandleFailure(FishDataProviderFailure failure)
        {
            consecutiveFailures++;
            BackoffInterval();

            telemetry?.LogEvent(TelemetryEvents.FishPollFailure, new
            {
                source = dataProvider?.SourceTag ?? "unknown",
                attempts = consecutiveFailures,
                reason = failure.Reason,
                durationMs = failure.DurationMs
            });

            // Add breadcrumb for debugging
            telemetry?.LogBreadcrumb("http", "Fish poll failed", new
            {
                reason = failure.Reason,
                consecutiveFailures
            });

            if (consecutiveFailures >= FailureWarningThreshold)
            {
                Debug.LogWarning($"Fish polling failed {consecutiveFailures} times consecutively. Keeping cached fish data.", this);
            }
        }

        private float GetWaitInterval()
        {
            return ClampInterval(currentInterval);
        }

        private void BackoffInterval()
        {
            var increased = currentInterval * 1.5f;
            currentInterval = ClampInterval(increased);
        }

        private float ClampInterval(float value)
        {
            if (config == null)
            {
                return Mathf.Max(0.1f, value);
            }

            var min = Mathf.Max(0.1f, config.minPollIntervalSeconds);
            var max = Mathf.Max(min, config.maxPollIntervalSeconds);
            return Mathf.Clamp(value, min, max);
        }
    }
}
