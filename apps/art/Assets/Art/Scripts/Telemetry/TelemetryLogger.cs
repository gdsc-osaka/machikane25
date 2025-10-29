using System;
using UnityEngine;

namespace Art.Telemetry
{
    [Serializable]
    public sealed class TelemetryLogger
    {
        [SerializeField] private string dsn;
        private bool initialized;

        public void Initialize(string sentryDsn)
        {
            dsn = sentryDsn;
            initialized = true;
            if (!string.IsNullOrEmpty(dsn))
            {
                Debug.Log($"Telemetry initialized with DSN {dsn}");
            }
            else
            {
                Debug.Log("Telemetry initialized without DSN.");
            }
        }

        public void LogInfo(string message)
        {
            if (!initialized)
            {
                return;
            }

            Debug.Log($"[Telemetry] {message}");
        }

        public void LogWarning(string message)
        {
            if (!initialized)
            {
                return;
            }

            Debug.LogWarning($"[Telemetry] {message}");
        }

        public void LogException(string contextMessage, Exception exception)
        {
            if (!initialized)
            {
                return;
            }

            Debug.LogError($"[Telemetry] {contextMessage}");
            if (exception != null)
            {
                Debug.LogException(exception);
            }
        }

        public void Flush()
        {
            if (!initialized)
            {
                return;
            }

            // Placeholder for Sentry flush logic.
        }
    }
}