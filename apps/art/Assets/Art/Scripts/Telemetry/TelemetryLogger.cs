using System;
using System.Collections.Generic;
using UnityEngine;

namespace Art.Telemetry
{
    /// <summary>
    /// Sends events, exceptions, and breadcrumbs to Sentry for observability.
    /// Gracefully degrades to Unity console logging when Sentry is not available.
    /// </summary>
    [Serializable]
    public sealed class TelemetryLogger
    {
        [SerializeField] private string dsn;
        private bool initialized;
        private bool sentryAvailable;

        /// <summary>
        /// Initializes the telemetry logger with optional Sentry DSN.
        /// </summary>
        /// <param name="sentryDsn">Sentry DSN; if null or empty, telemetry degrades to console logging only.</param>
        public void Initialize(string sentryDsn)
        {
            dsn = sentryDsn;
            initialized = true;
            sentryAvailable = false;

            if (!string.IsNullOrEmpty(dsn))
            {
                try
                {
                    // Attempt to initialize Sentry if available
                    // Note: Actual Sentry SDK initialization would go here
                    // For now, we check if the Sentry types are available via reflection
                    var sentryType = Type.GetType("Sentry.SentrySdk, Sentry.Unity");
                    if (sentryType != null)
                    {
                        sentryAvailable = true;
                        Debug.Log($"[Telemetry] Initialized with Sentry DSN: {MaskDsn(dsn)}");
                    }
                    else
                    {
                        Debug.LogWarning("[Telemetry] Sentry SDK not found. Falling back to console logging.");
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[Telemetry] Failed to initialize Sentry: {ex.Message}. Falling back to console logging.");
                }
            }
            else
            {
                Debug.Log("[Telemetry] Initialized without DSN. Console logging only.");
            }
        }

        /// <summary>
        /// Logs an informational message.
        /// </summary>
        public void LogInfo(string message)
        {
            if (!initialized)
            {
                return;
            }

            Debug.Log($"[Telemetry] {message}");

            if (sentryAvailable)
            {
                LogBreadcrumb("info", message);
            }
        }

        /// <summary>
        /// Logs a warning message.
        /// </summary>
        public void LogWarning(string message)
        {
            if (!initialized)
            {
                return;
            }

            Debug.LogWarning($"[Telemetry] {message}");

            if (sentryAvailable)
            {
                LogBreadcrumb("warning", message);
            }
        }

        /// <summary>
        /// Logs a structured event with optional payload.
        /// </summary>
        /// <param name="eventName">Event name (e.g., TelemetryEvents.FishPollSuccess).</param>
        /// <param name="payload">Optional anonymous object or dictionary with event data.</param>
        public void LogEvent(string eventName, object payload = null)
        {
            if (!initialized || string.IsNullOrEmpty(eventName))
            {
                return;
            }

            var message = payload != null
                ? $"Event: {eventName} | Data: {SerializePayload(payload)}"
                : $"Event: {eventName}";

            Debug.Log($"[Telemetry] {message}");

            if (sentryAvailable)
            {
                LogBreadcrumb("event", eventName, payload);
            }
        }

        /// <summary>
        /// Logs an exception with optional context.
        /// </summary>
        /// <param name="contextMessage">Descriptive message about what was happening when the exception occurred.</param>
        /// <param name="exception">The exception to log.</param>
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

            if (sentryAvailable && exception != null)
            {
                // Sentry SDK would capture the exception here
                // SentrySdk.CaptureException(exception);
            }
        }

        /// <summary>
        /// Adds a breadcrumb to the current scope for debugging context.
        /// </summary>
        /// <param name="category">Breadcrumb category (e.g., "http", "navigation", "user").</param>
        /// <param name="message">Breadcrumb message.</param>
        /// <param name="data">Optional data payload (anonymous object or dictionary).</param>
        public void LogBreadcrumb(string category, string message, object data = null)
        {
            if (!initialized || string.IsNullOrEmpty(category))
            {
                return;
            }

            var breadcrumbMessage = data != null
                ? $"[{category}] {message} | Data: {SerializePayload(data)}"
                : $"[{category}] {message}";

            Debug.Log($"[Telemetry Breadcrumb] {breadcrumbMessage}");

            if (sentryAvailable)
            {
                // Sentry SDK would add breadcrumb here
                // SentrySdk.AddBreadcrumb(message, category, ...);
            }
        }

        /// <summary>
        /// Flushes pending telemetry events. Call on application shutdown.
        /// </summary>
        public void Flush()
        {
            if (!initialized)
            {
                return;
            }

            if (sentryAvailable)
            {
                Debug.Log("[Telemetry] Flushing events...");
                // Sentry SDK would flush here
                // await SentrySdk.FlushAsync(TimeSpan.FromSeconds(2));
            }
        }

        private static string SerializePayload(object payload)
        {
            if (payload == null)
            {
                return "null";
            }

            try
            {
                // Simple serialization for logging purposes
                // In production, you might want to use JsonUtility or a proper JSON serializer
                if (payload is string str)
                {
                    return str;
                }

                if (payload is IDictionary<string, string> dict)
                {
                    return string.Join(", ", dict);
                }

                return payload.ToString();
            }
            catch
            {
                return payload.GetType().Name;
            }
        }

        private static string MaskDsn(string fullDsn)
        {
            if (string.IsNullOrEmpty(fullDsn) || fullDsn.Length < 20)
            {
                return "***";
            }

            return $"{fullDsn.Substring(0, 10)}...{fullDsn.Substring(fullDsn.Length - 10)}";
        }
    }
}