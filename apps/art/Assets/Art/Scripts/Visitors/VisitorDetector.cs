using System;
using System.Collections;
using System.Collections.Generic;
using Art.App;
using Art.Telemetry;
using UnityEngine;
using Unity.Barracuda;

namespace Art.Visitors
{
    /// <summary>
    /// Represents a mock visitor position for debugging purposes.
    /// </summary>
    [Serializable]
    public struct MockVisitor
    {
        [Tooltip("Normalized position (0-1 range) in screen space")]
        public Vector2 position;
        [Tooltip("Magnitude/intensity of this visitor (typically 0-1)")]
        [Range(0f, 1f)]
        public float magnitude;
    }

    /// <summary>
    /// Captures webcam frames, detects visitor clusters using YoloV3Tiny, and raises attractor updates for the boid system.
    /// </summary>
    public sealed class VisitorDetector : MonoBehaviour
    {
        [Header("Model")]
        [SerializeField] private NNModel yoloModel;

        [Header("Calibration")]
        [SerializeField] private CameraCalibration calibration;
        [SerializeField] private string preferredCameraName;

        [Header("Processing")]
        [SerializeField] private int targetWidth = 640;
        [SerializeField] private int targetHeight = 360;
        [SerializeField] private float mergeDistance = 0.2f;
        [SerializeField] private float confidenceThreshold = 0.5f;
        [SerializeField] private float smoothingSpeed = 6f;
        [SerializeField] private float absenceDamping = 3f;

        [Header("Debug Mode")]
        [SerializeField] [Tooltip("Enable to use mock visitor positions instead of camera detection")]
        private bool useMockVisitors;
        [SerializeField] [Tooltip("Mock visitor positions (0-1 range) for debugging fish behavior")]
        private MockVisitor[] mockVisitors = Array.Empty<MockVisitor>();
        [SerializeField] [Tooltip("Update interval for mock visitors in seconds")]
        private float mockUpdateInterval = 0.1f;

        private readonly List<VisitorGroup> cachedVisitors = new List<VisitorGroup>();

        private AppConfig config;
        private TelemetryLogger telemetry;
        private Coroutine detectionRoutine;
        private WebCamTexture webcam;
        private VisitorDetectionProcessor processor;
        private bool initialized;

        public event Action<IReadOnlyList<VisitorGroup>> OnVisitorsChanged;

        public void Initialize(AppConfig cfg, TelemetryLogger telemetryLogger)
        {
            config = cfg;
            telemetry = telemetryLogger;
            initialized = true;
            EnsureProcessor();
        }

        public void StartDetection()
        {
            if (!initialized || detectionRoutine != null || !isActiveAndEnabled)
            {
                return;
            }

            // Use mock visitor mode if enabled
            if (useMockVisitors)
            {
                telemetry?.LogInfo("VisitorDetector starting in MOCK mode with fake visitor positions");
                detectionRoutine = StartCoroutine(MockVisitorLoop());
                return;
            }

            EnsureProcessor();

            webcam = CreateWebcam();
            if (webcam == null)
            {
                telemetry?.LogWarning("VisitorDetector could not locate an active webcam device.");
                return;
            }

            try
            {
                webcam.Play();
            }
            catch (Exception ex)
            {
                telemetry?.LogException("VisitorDetector failed to start webcam playback.", ex);
                DestroyWebcam();
                return;
            }

            detectionRoutine = StartCoroutine(ProcessLoop());
        }

        public void StopDetection()
        {
            if (detectionRoutine != null)
            {
                StopCoroutine(detectionRoutine);
                detectionRoutine = null;
            }

            DestroyWebcam();

            if (processor != null)
            {
                processor.Reset();
                processor.Dispose();
                processor = null;
            }

            cachedVisitors.Clear();
        }

        /// <summary>
        /// Set mock visitors at runtime for debugging. Only works when useMockVisitors is true.
        /// </summary>
        public void SetMockVisitors(MockVisitor[] visitors)
        {
            if (visitors == null)
            {
                mockVisitors = Array.Empty<MockVisitor>();
            }
            else
            {
                mockVisitors = visitors;
            }
        }

        /// <summary>
        /// Enable or disable mock visitor mode at runtime. Will restart detection if currently running.
        /// </summary>
        public void SetMockMode(bool enabled)
        {
            if (useMockVisitors == enabled)
            {
                return;
            }

            bool wasRunning = detectionRoutine != null;
            if (wasRunning)
            {
                StopDetection();
            }

            useMockVisitors = enabled;

            if (wasRunning && initialized)
            {
                StartDetection();
            }
        }

        private void OnDisable()
        {
            StopDetection();
        }

        private IEnumerator ProcessLoop()
        {
            while (enabled && webcam != null)
            {
                yield return new WaitForEndOfFrame();

                if (webcam == null || !webcam.isPlaying || !webcam.didUpdateThisFrame)
                {
                    yield return null;
                    continue;
                }

                try
                {
                    EmitVisitors();
                }
                catch (Exception ex)
                {
                    telemetry?.LogException("Visitor detection loop failed.", ex);
                }

                var waitSeconds = Mathf.Max(0.05f, config != null ? config.visitorDetectionIntervalSeconds : 0.5f);
                if (waitSeconds > 0f)
                {
                    yield return new WaitForSeconds(waitSeconds);
                }
                else
                {
                    yield return null;
                }
            }

            detectionRoutine = null;
        }

        private IEnumerator MockVisitorLoop()
        {
            while (enabled && useMockVisitors)
            {
                try
                {
                    EmitMockVisitors();
                }
                catch (Exception ex)
                {
                    telemetry?.LogException("Mock visitor loop failed.", ex);
                }

                var waitSeconds = Mathf.Max(0.05f, mockUpdateInterval);
                yield return new WaitForSeconds(waitSeconds);
            }

            detectionRoutine = null;
        }

        private void EmitVisitors()
        {
            EnsureProcessor();
            if (processor == null)
            {
                return;
            }

            var detections = processor.Process(webcam, ApplyCalibration);
            if ((detections == null || detections.Count == 0) && cachedVisitors.Count == 0)
            {
                return;
            }

            cachedVisitors.Clear();
            if (detections != null)
            {
                for (var i = 0; i < detections.Count; i++)
                {
                    cachedVisitors.Add(detections[i]);
                }
            }

            OnVisitorsChanged?.Invoke(cachedVisitors);
        }

        private void EmitMockVisitors()
        {
            cachedVisitors.Clear();

            if (mockVisitors != null && mockVisitors.Length > 0)
            {
                for (var i = 0; i < mockVisitors.Length; i++)
                {
                    var mock = mockVisitors[i];
                    // Clamp position to 0-1 range
                    var clampedPosition = new Vector2(
                        Mathf.Clamp01(mock.position.x),
                        Mathf.Clamp01(mock.position.y)
                    );
                    var clampedMagnitude = Mathf.Clamp01(mock.magnitude);

                    // Apply calibration if available
                    var calibratedPosition = ApplyCalibration(clampedPosition);

                    cachedVisitors.Add(new VisitorGroup(calibratedPosition, clampedMagnitude));
                }

                Debug.Log($"[MOCK MODE] Emitting {cachedVisitors.Count} mock visitors");
            }

            OnVisitorsChanged?.Invoke(cachedVisitors);
        }

        private WebCamTexture CreateWebcam()
        {
            var devices = WebCamTexture.devices;
            if (devices == null || devices.Length == 0)
            {
                return null;
            }

            for (var i = 0; i < devices.Length; i++)
            {
                telemetry?.LogInfo($"VisitorDetector found webcam device: {devices[i].name} (FrontFacing={devices[i].isFrontFacing})");
            }
                
            WebCamDevice selectedDevice = devices[0];
            var hasSelection = false;

            if (!string.IsNullOrWhiteSpace(preferredCameraName))
            {
                for (var i = 0; i < devices.Length; i++)
                {
                    if (string.Equals(devices[i].name, preferredCameraName, StringComparison.Ordinal))
                    {
                        selectedDevice = devices[i];
                        hasSelection = true;
                        break;
                    }
                }
            }

            if (!hasSelection)
            {
                for (var i = 0; i < devices.Length; i++)
                {
                    if (!devices[i].isFrontFacing)
                    {
                        selectedDevice = devices[i];
                        hasSelection = true;
                        break;
                    }
                }
            }

            if (!hasSelection)
            {
                selectedDevice = devices[0];
            }
            
            telemetry?.LogInfo($"VisitorDetector selected webcam device: {selectedDevice.name} (FrontFacing={selectedDevice.isFrontFacing})");

            return new WebCamTexture(selectedDevice.name, targetWidth, targetHeight, 15);
        }

        private void DestroyWebcam()
        {
            if (webcam == null)
            {
                return;
            }

            try
            {
                if (webcam.isPlaying)
                {
                    webcam.Stop();
                }
            }
            catch (Exception ex)
            {
                telemetry?.LogException("VisitorDetector failed to stop webcam playback.", ex);
            }

            Destroy(webcam);
            webcam = null;
        }

        private void EnsureProcessor()
        {
            if (processor != null)
            {
                return;
            }

            if (yoloModel == null)
            {
                telemetry?.LogWarning("VisitorDetector: YoloV3Tiny model asset is not assigned.");
                return;
            }

            processor = new VisitorDetectionProcessor(yoloModel, mergeDistance, confidenceThreshold, smoothingSpeed, absenceDamping);
        }

        private Vector2 ApplyCalibration(Vector2 normalised)
        {
            return calibration != null ? calibration.Transform(normalised) : normalised;
        }

        internal IReadOnlyList<VisitorGroup> ProcessFrameForTesting(Color32[] pixels, int width, int height, float deltaTime, float timestamp)
        {
            EnsureProcessor();
            return processor.Process(pixels, width, height, deltaTime, timestamp, ApplyCalibration);
        }
    }
}
