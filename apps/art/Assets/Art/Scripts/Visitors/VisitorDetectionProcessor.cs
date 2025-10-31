using System;
using System.Collections.Generic;
using UnityEngine;
using Unity.Barracuda;

namespace Art.Visitors
{
    /// <summary>
    /// Processes camera frames using YoloV3Tiny for person detection and maintains smoothed centroids.
    /// </summary>
    internal sealed class VisitorDetectionProcessor
    {
        private readonly NNModel modelAsset;
        private readonly float mergeDistance;
        private readonly float mergeDistanceSquared;
        private readonly float confidenceThreshold;
        private readonly float smoothingSpeed;
        private readonly float absenceDamping;

        private IWorker worker;
        private Model runtimeModel;
        private Color32[] frameBuffer;

        private const int YoloInputSize = 416;
        private const int PersonClassIndex = 0;
        private const int AmountOfClasses = 80;
        private const int Box20Sections = 13;
        private const int Box40Sections = 26;
        private const int AnchorBatchSize = 85;
        private const float IouThreshold = 0.45f;

        private readonly float[] anchors = { 10, 14, 23, 27, 37, 58, 81, 82, 135, 169, 344, 319 };

        private readonly List<VisitorGroup> rawGroups = new List<VisitorGroup>();
        private readonly List<VisitorGroup> smoothedGroups = new List<VisitorGroup>();
        private readonly List<SmoothEntry> smoothEntries = new List<SmoothEntry>();

        public VisitorDetectionProcessor(NNModel modelAsset, float mergeDistance, float confidenceThreshold, float smoothingSpeed, float absenceDamping)
        {
            this.modelAsset = modelAsset ?? throw new ArgumentNullException(nameof(modelAsset));
            this.mergeDistance = Mathf.Max(0.01f, mergeDistance);
            mergeDistanceSquared = this.mergeDistance * this.mergeDistance;
            this.confidenceThreshold = Mathf.Clamp01(confidenceThreshold);
            this.smoothingSpeed = Mathf.Max(0.01f, smoothingSpeed);
            this.absenceDamping = Mathf.Max(0.01f, absenceDamping);

            InitializeModel();
        }

        private void InitializeModel()
        {
            runtimeModel = ModelLoader.Load(modelAsset);
            worker = WorkerFactory.CreateWorker(WorkerFactory.Type.ComputePrecompiled, runtimeModel);

            // Log model structure for debugging
            Debug.Log($"[VisitorDetectionProcessor] Model loaded: {runtimeModel.ProducerName}");
            Debug.Log($"[VisitorDetectionProcessor] Input count: {runtimeModel.inputs.Count}");
            foreach (var input in runtimeModel.inputs)
            {
                Debug.Log($"[VisitorDetectionProcessor] Input: {input.name}, shape: {input.shape}");
            }
            Debug.Log($"[VisitorDetectionProcessor] Output count: {runtimeModel.outputs.Count}");
            foreach (var output in runtimeModel.outputs)
            {
                Debug.Log($"[VisitorDetectionProcessor] Output: {output}");
            }
        }

        public IReadOnlyList<VisitorGroup> Process(WebCamTexture webcam, Func<Vector2, Vector2> projector)
        {
            if (webcam == null || worker == null)
            {
                return Array.Empty<VisitorGroup>();
            }

            var width = Mathf.Max(1, webcam.width);
            var height = Mathf.Max(1, webcam.height);

            if (frameBuffer == null || frameBuffer.Length != width * height)
            {
                frameBuffer = new Color32[width * height];
            }

            webcam.GetPixels32(frameBuffer);
            return Process(frameBuffer, width, height, Time.unscaledDeltaTime, Time.unscaledTime, projector);
        }

        public IReadOnlyList<VisitorGroup> Process(Color32[] pixels, int width, int height, float deltaTime, float timestamp, Func<Vector2, Vector2> projector)
        {
            if (pixels == null || pixels.Length < width * height || worker == null)
            {
                return Array.Empty<VisitorGroup>();
            }

            rawGroups.Clear();

            var detections = RunYoloInference(pixels, width, height);
            ConvertDetectionsToGroups(detections, projector, width, height);
            Smooth(timestamp, deltaTime);

            return smoothedGroups;
        }

        public void Reset()
        {
            rawGroups.Clear();
            smoothedGroups.Clear();
            smoothEntries.Clear();
        }

        public void Dispose()
        {
            worker?.Dispose();
            worker = null;
        }

        private List<PersonDetection> RunYoloInference(Color32[] pixels, int width, int height)
        {
            var detections = new List<PersonDetection>();

            var inputTensor = PreprocessImage(pixels, width, height);

            worker.Execute(inputTensor);

            // YoloV3Tiny outputs raw YOLO format with two scales
            var output13 = worker.PeekOutput("016_convolutional"); // 13x13 grid for large objects
            var output26 = worker.PeekOutput("023_convolutional"); // 26x26 grid for small objects

            if (output13 != null && output26 != null)
            {
                DecodeYoloOutput(output26, Box40Sections, 0, detections);
                DecodeYoloOutput(output13, Box20Sections, 3, detections);

                // Apply Non-Maximum Suppression to remove overlapping detections
                ApplyNonMaxSuppression(detections);
            }

            inputTensor.Dispose();

            return detections;
        }

        private Tensor PreprocessImage(Color32[] pixels, int width, int height)
        {
            var resizedTexture = new Texture2D(YoloInputSize, YoloInputSize, TextureFormat.RGB24, false);
            var tempTexture = new Texture2D(width, height, TextureFormat.RGB24, false);
            tempTexture.SetPixels32(pixels);
            tempTexture.Apply();

            RenderTexture rt = RenderTexture.GetTemporary(YoloInputSize, YoloInputSize);
            Graphics.Blit(tempTexture, rt);
            RenderTexture.active = rt;
            resizedTexture.ReadPixels(new Rect(0, 0, YoloInputSize, YoloInputSize), 0, 0);
            resizedTexture.Apply();
            RenderTexture.active = null;
            RenderTexture.ReleaseTemporary(rt);

            UnityEngine.Object.Destroy(tempTexture);

            var inputTensor = new Tensor(resizedTexture, 3);
            UnityEngine.Object.Destroy(resizedTexture);

            return inputTensor;
        }

        private void DecodeYoloOutput(Tensor output, int boxSections, int anchorMask, List<PersonDetection> detections)
        {
            for (var boundingBoxX = 0; boundingBoxX < boxSections; boundingBoxX++)
            {
                for (var boundingBoxY = 0; boundingBoxY < boxSections; boundingBoxY++)
                {
                    for (var anchor = 0; anchor < 3; anchor++)
                    {
                        var objectness = output[0, boundingBoxX, boundingBoxY, anchor * AnchorBatchSize + 4];
                        if (objectness < confidenceThreshold)
                        {
                            continue;
                        }

                        // Find the best class
                        var personScore = output[0, boundingBoxX, boundingBoxY, anchor * AnchorBatchSize + 5 + PersonClassIndex];
                        var confidence = objectness * personScore;

                        if (confidence < confidenceThreshold)
                        {
                            continue;
                        }

                        // Extract box coordinates
                        var rawX = output[0, boundingBoxX, boundingBoxY, anchor * AnchorBatchSize + 0];
                        var rawY = output[0, boundingBoxX, boundingBoxY, anchor * AnchorBatchSize + 1];
                        var rawW = output[0, boundingBoxX, boundingBoxY, anchor * AnchorBatchSize + 2];
                        var rawH = output[0, boundingBoxX, boundingBoxY, anchor * AnchorBatchSize + 3];

                        // Convert to pixel coordinates
                        var anchorIndex = anchor + anchorMask;
                        var x = (-YoloInputSize * 0.5f) + YoloInputSize / boxSections * 0.5f +
                                YoloInputSize / boxSections * boundingBoxY + Sigmoid(rawX);
                        var y = (-YoloInputSize * 0.5f) + YoloInputSize / boxSections * 0.5f +
                                YoloInputSize / boxSections * boundingBoxX + Sigmoid(rawY);
                        var w = anchors[anchorIndex * 2] * Mathf.Exp(rawW);
                        var h = anchors[anchorIndex * 2 + 1] * Mathf.Exp(rawH);

                        // Normalize to 0-1 range
                        var centerX = (x + YoloInputSize * 0.5f) / YoloInputSize;
                        var centerY = (y + YoloInputSize * 0.5f) / YoloInputSize;
                        var normalizedWidth = w / YoloInputSize;
                        var normalizedHeight = h / YoloInputSize;

                        detections.Add(new PersonDetection
                        {
                            Center = new Vector2(centerX, centerY),
                            Size = new Vector2(normalizedWidth, normalizedHeight),
                            Confidence = confidence
                        });
                    }
                }
            }
        }

        private float Sigmoid(float value)
        {
            return 1.0f / (1.0f + Mathf.Exp(-value));
        }

        private void ApplyNonMaxSuppression(List<PersonDetection> detections)
        {
            for (var i = 0; i < detections.Count - 1; i++)
            {
                for (var j = i + 1; j < detections.Count; j++)
                {
                    if (IntersectionOverUnion(detections[i], detections[j]) > IouThreshold)
                    {
                        // Remove the detection with lower confidence
                        if (detections[i].Confidence < detections[j].Confidence)
                        {
                            detections.RemoveAt(i);
                            i--;
                            break;
                        }
                        else
                        {
                            detections.RemoveAt(j);
                            j--;
                        }
                    }
                }
            }
        }

        private float IntersectionOverUnion(PersonDetection box1, PersonDetection box2)
        {
            var b1x1 = box1.Center.x - 0.5f * box1.Size.x;
            var b1x2 = box1.Center.x + 0.5f * box1.Size.x;
            var b1y1 = box1.Center.y - 0.5f * box1.Size.y;
            var b1y2 = box1.Center.y + 0.5f * box1.Size.y;
            var b2x1 = box2.Center.x - 0.5f * box2.Size.x;
            var b2x2 = box2.Center.x + 0.5f * box2.Size.x;
            var b2y1 = box2.Center.y - 0.5f * box2.Size.y;
            var b2y2 = box2.Center.y + 0.5f * box2.Size.y;

            var xLeft = Mathf.Max(b1x1, b2x1);
            var yTop = Mathf.Max(b1y1, b2y1);
            var xRight = Mathf.Min(b1x2, b2x2);
            var yBottom = Mathf.Min(b1y2, b2y2);

            if (xRight < xLeft || yBottom < yTop)
            {
                return 0.0f;
            }

            var intersectionArea = (xRight - xLeft) * (yBottom - yTop);
            var b1area = (b1x2 - b1x1) * (b1y2 - b1y1);
            var b2area = (b2x2 - b2x1) * (b2y2 - b2y1);
            return intersectionArea / (b1area + b2area - intersectionArea);
        }

        private void ConvertDetectionsToGroups(List<PersonDetection> detections, Func<Vector2, Vector2> projector, int width, int height)
        {
            rawGroups.Clear();

            for (var i = 0; i < detections.Count; i++)
            {
                var detection = detections[i];
                var mapped = projector != null ? projector(detection.Center) : detection.Center;
                var magnitude = Mathf.Clamp01(detection.Confidence * detection.Size.x * detection.Size.y);
                rawGroups.Add(new VisitorGroup(mapped, magnitude));
            }
        }

        private void Smooth(float timestamp, float deltaTime)
        {
            var blend = 1f - Mathf.Exp(-smoothingSpeed * Mathf.Max(0f, deltaTime));
            var decay = 1f - Mathf.Exp(-absenceDamping * Mathf.Max(0f, deltaTime));

            for (var i = 0; i < smoothEntries.Count; i++)
            {
                var entry = smoothEntries[i];
                entry.Marked = false;
                smoothEntries[i] = entry;
            }
            for (var i = 0; i < rawGroups.Count; i++)
            {
                var source = rawGroups[i];
                var bestIndex = -1;
                var bestDistance = float.MaxValue;

                for (var j = 0; j < smoothEntries.Count; j++)
                {
                    if (smoothEntries[j].Marked)
                    {
                        continue;
                    }

                    var distance = Vector2.SqrMagnitude(smoothEntries[j].Position - source.Position);
                    if (distance < bestDistance && distance <= mergeDistanceSquared)
                    {
                        bestDistance = distance;
                        bestIndex = j;
                    }
                }

                if (bestIndex >= 0)
                {
                    var entry = smoothEntries[bestIndex];
                    entry.Position = Vector2.Lerp(entry.Position, source.Position, blend);
                    entry.Magnitude = Mathf.Lerp(entry.Magnitude, source.Magnitude, blend);
                    entry.LastUpdate = timestamp;
                    entry.Marked = true;
                    smoothEntries[bestIndex] = entry;
                }
                else
                {
                    smoothEntries.Add(new SmoothEntry
                    {
                        Position = source.Position,
                        Magnitude = source.Magnitude,
                        LastUpdate = timestamp,
                        Marked = true
                    });
                }
            }

            for (var i = smoothEntries.Count - 1; i >= 0; i--)
            {
                var entry = smoothEntries[i];
                if (entry.Marked)
                {
                    continue;
                }

                entry.Magnitude = Mathf.Lerp(entry.Magnitude, 0f, decay);
                entry.LastUpdate = timestamp;
                smoothEntries[i] = entry;

                if (entry.Magnitude < 0.0001f)
                {
                    smoothEntries.RemoveAt(i);
                }
            }

            smoothedGroups.Clear();
            for (var i = 0; i < smoothEntries.Count; i++)
            {
                var entry = smoothEntries[i];
                smoothedGroups.Add(new VisitorGroup(entry.Position, entry.Magnitude));
            }
        }

        private struct PersonDetection
        {
            public Vector2 Center;
            public Vector2 Size;
            public float Confidence;
        }

        private struct SmoothEntry
        {
            public Vector2 Position;
            public float Magnitude;
            public float LastUpdate;
            public bool Marked;
        }
    }
}
