using Art.App;
using Art.Telemetry;
using System;
using System.Collections;
using System.Collections.Generic;

namespace Art.Fish
{
    public interface IFishDataProvider
    {
        string SourceTag { get; }
        IEnumerator Fetch(FishDataProviderContext context);
    }

    public sealed class FishDataProviderContext
    {
        public FishDataProviderContext(
            AppConfig config,
            TelemetryLogger telemetry,
            Action<FishDataProviderSuccess> onSuccess,
            Action<FishDataProviderFailure> onFailure)
        {
            Config = config;
            Telemetry = telemetry;
            ReportSuccess = onSuccess;
            ReportFailure = onFailure;
        }

        public AppConfig Config { get; }
        public TelemetryLogger Telemetry { get; }
        public Action<FishDataProviderSuccess> ReportSuccess { get; }
        public Action<FishDataProviderFailure> ReportFailure { get; }
    }

    public sealed class FishDataProviderSuccess
    {
        public FishDataProviderSuccess(IReadOnlyList<FishState> states, float durationMs, IReadOnlyDictionary<string, string> headers = null)
        {
            States = states ?? Array.Empty<FishState>();
            DurationMs = durationMs;
            Headers = headers ?? new Dictionary<string, string>();
        }

        public IReadOnlyList<FishState> States { get; }
        public float DurationMs { get; }
        public IReadOnlyDictionary<string, string> Headers { get; }
    }

    public sealed class FishDataProviderFailure
    {
        public FishDataProviderFailure(string reason, float durationMs)
        {
            Reason = string.IsNullOrWhiteSpace(reason) ? "unknown_error" : reason;
            DurationMs = durationMs;
        }

        public string Reason { get; }
        public float DurationMs { get; }
    }
}
