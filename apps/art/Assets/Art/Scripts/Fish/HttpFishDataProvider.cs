using Art.App;
using Art.Infrastructure;
using Art.Telemetry;
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Art.Fish
{
    public sealed class HttpFishDataProvider : IFishDataProvider
    {
        private readonly IHttpClient httpClient;

        public HttpFishDataProvider(IHttpClient client = null)
        {
            httpClient = client ?? HttpClientFactory.Create();
        }

        public string SourceTag => "backend";

        public IEnumerator Fetch(FishDataProviderContext context)
        {
            if (context == null)
            {
                yield break;
            }

            var config = context.Config;
            var telemetry = context.Telemetry;

            if (config == null)
            {
                context.ReportFailure?.Invoke(new FishDataProviderFailure("missing_config", 0f));
                yield break;
            }

            if (httpClient == null)
            {
                context.ReportFailure?.Invoke(new FishDataProviderFailure("missing_http_client", 0f));
                yield break;
            }

            var url = BuildEndpoint(config);
            if (string.IsNullOrEmpty(url))
            {
                context.ReportFailure?.Invoke(new FishDataProviderFailure("missing_backend_url", 0f));
                yield break;
            }

            var headers = BuildHeaders(config);
            HttpResponse response = null;
            var start = Time.realtimeSinceStartup;

            yield return httpClient.Get(url, headers, r => response = r);

            var durationMs = (Time.realtimeSinceStartup - start) * 1000f;
            if (response == null)
            {
                context.ReportFailure?.Invoke(new FishDataProviderFailure("no_response", durationMs));
                yield break;
            }

            if (!response.IsSuccessStatusCode)
            {
                var reason = !string.IsNullOrEmpty(response.Error) ? response.Error : $"HTTP {(int)response.StatusCode}";
                context.ReportFailure?.Invoke(new FishDataProviderFailure(reason, durationMs));
                yield break;
            }

            var states = DeserializeFish(response.Body, telemetry);
            context.ReportSuccess?.Invoke(new FishDataProviderSuccess(states, durationMs, response.Headers));
        }

        private static string BuildEndpoint(AppConfig config)
        {
            if (config == null || string.IsNullOrWhiteSpace(config.backendUrl))
            {
                return string.Empty;
            }

            var baseUrl = config.backendUrl.TrimEnd('/');
            return $"{baseUrl}/get-fish";
        }

        private static Dictionary<string, string> BuildHeaders(AppConfig config)
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

        private static List<FishState> DeserializeFish(string payload, TelemetryLogger telemetry)
        {
            var states = new List<FishState>();

            if (string.IsNullOrEmpty(payload))
            {
                return states;
            }

            try
            {
                var dtos = JsonUtilityExtensions.FromJsonArray<FishDto>(payload);
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
            }
            catch (Exception ex)
            {
                telemetry?.LogException("Failed to deserialize fish payload.", ex);
            }

            return states;
        }
    }
}
