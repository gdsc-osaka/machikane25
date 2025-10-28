using Art.App;
using Art.Telemetry;
using System.Collections;
using UnityEngine;

namespace Art.Visitors
{
    public sealed class VisitorDetector : MonoBehaviour
    {
        private AppConfig config;
        private TelemetryLogger telemetry;
        private Coroutine detectionRoutine;
        private bool initialized;

        public void Initialize(AppConfig cfg, TelemetryLogger telemetryLogger)
        {
            config = cfg;
            telemetry = telemetryLogger;
            initialized = true;
        }

        public void StartDetection()
        {
            if (!initialized || detectionRoutine != null || !isActiveAndEnabled)
            {
                return;
            }

            detectionRoutine = StartCoroutine(RunDetection());
        }

        public void StopDetection()
        {
            if (detectionRoutine == null)
            {
                return;
            }

            StopCoroutine(detectionRoutine);
            detectionRoutine = null;
        }

        private void OnDisable()
        {
            StopDetection();
        }

        private IEnumerator RunDetection()
        {
            while (enabled)
            {
                try
                {
                    // Placeholder: OpenCV processing is implemented in later tasks.
                }
                catch (System.Exception ex)
                {
                    telemetry?.LogException("Visitor detection loop failed.", ex);
                }

                var waitSeconds = Mathf.Max(0.05f, config != null ? config.visitorDetectionIntervalSeconds : 0.5f);
                yield return new WaitForSeconds(waitSeconds);
            }

            detectionRoutine = null;
        }
    }
}