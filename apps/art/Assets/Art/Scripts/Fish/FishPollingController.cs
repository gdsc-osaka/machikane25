using Art.App;
using Art.Infrastructure;
using Art.Telemetry;
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Art.Fish
{
    public sealed class FishPollingController : MonoBehaviour
    {
        private const int FailureWarningThreshold = 3;

        private AppConfig config;
        private FishRepository repository;
        private TelemetryLogger telemetry;
        private IHttpClient httpClient;
        private float defaultInterval;
        private float currentInterval;
        private int consecutiveFailures;
        private bool isInitialized;

        internal void SetHttpClient(IHttpClient client)
        {
            httpClient = client;
        }

        public void Initialize(AppConfig cfg, FishRepository repo, TelemetryLogger telemetryLogger)
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
            httpClient ??= HttpClientFactory.Create();

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

            if (httpClient == null)
            {
                telemetry?.LogWarning("FishPollingController missing HTTP client; skipping fetch.");
                yield break;
            }

            var requestUrl = BuildEndpoint();
            if (string.IsNullOrEmpty(requestUrl))
            {
                telemetry?.LogWarning("FishPollingController missing backend URL; skipping fetch.");
                yield break;
            }

            var headers = BuildHeaders();
            HttpResponse response = null;
            var startTime = Time.realtimeSinceStartup;

            yield return httpClient.Get(requestUrl, headers, r => response = r);

            var durationMs = (Time.realtimeSinceStartup - startTime) * 1000f;

            if (response == null)
            {
                HandleFailure("No response received from HTTP layer.", durationMs);
                yield break;
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorDescription = !string.IsNullOrEmpty(response.Error)
                    ? response.Error
                    : $"HTTP {(int)response.StatusCode}";
                HandleFailure(errorDescription, durationMs);
                yield break;
            }

            HandleSuccess(response.Body, durationMs);
        }

        private string BuildEndpoint()
        {
            if (config == null || string.IsNullOrWhiteSpace(config.backendUrl))
            {
                return string.Empty;
            }

            var baseUrl = config.backendUrl.TrimEnd('/');
            return $"{baseUrl}/get-fish";
        }

        private Dictionary<string, string> BuildHeaders()
        {
            var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "Content-Type", "application/json" }
            };

            if (!string.IsNullOrEmpty(config.apiKey))
            {
                headers["X-API-KEY"] = config.apiKey;
            }

            return headers;
        }

        private void HandleSuccess(string payload, float durationMs)
        {
            try
            {
                var dtos = JsonUtilityExtensions.FromJsonArray<FishDto>(payload);
                var states = new List<FishState>(dtos.Length);
                for (var i = 0; i < dtos.Length; i++)
                {
                    var dto = dtos[i];
                    if (FishStateMapper.TryMap(dto, out var state, out var error))
                    {
                        states.Add(state);
                    }
                    else
                    {
                        telemetry?.LogWarning(error);
                    }
                }

                var diff = repository.ApplyPayload(states);
                consecutiveFailures = 0;
                currentInterval = defaultInterval;

                telemetry?.LogInfo($"fish_poll_success added={diff.Added.Count} updated={diff.Updated.Count} removed={diff.Removed.Count} durationMs={durationMs:F1}");
            }
            catch (Exception ex)
            {
                telemetry?.LogException("Fish polling payload processing failed.", ex);
                BackoffInterval();
            }
        }

        private void HandleFailure(string reason, float durationMs)
        {
            consecutiveFailures++;
            BackoffInterval();

            telemetry?.LogWarning($"fish_poll_failed attempts={consecutiveFailures} reason={reason} durationMs={durationMs:F1}");

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