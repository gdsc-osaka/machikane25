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
            var imageShapeTensor = new Tensor(1, 2, new float[] { height, width });

            var inputs = new Dictionary<string, Tensor>
            {
                { "input_1", inputTensor },
                { "image_shape", imageShapeTensor }
            };

            worker.Execute(inputs);

            var boxes = worker.PeekOutput("yolonms_layer_1");
            var scores = worker.PeekOutput("yolonms_layer_1:1");
            var indices = worker.PeekOutput("yolonms_layer_1:2");

            ParseYoloOutput(boxes, scores, indices, width, height, detections);

            inputTensor.Dispose();
            imageShapeTensor.Dispose();

            return detections;
        }

        private Tensor PreprocessImage(Color32[] pixels, int width, int height)
        {
            var inputData = new float[1 * 3 * YoloInputSize * YoloInputSize];

            for (var y = 0; y < YoloInputSize; y++)
            {
                for (var x = 0; x < YoloInputSize; x++)
                {
                    var srcX = (int)((float)x / YoloInputSize * width);
                    var srcY = (int)((float)y / YoloInputSize * height);
                    var srcIndex = srcY * width + srcX;

                    if (srcIndex >= 0 && srcIndex < pixels.Length)
                    {
                        var pixel = pixels[srcIndex];
                        var baseIndex = y * YoloInputSize + x;

                        inputData[0 * YoloInputSize * YoloInputSize + baseIndex] = pixel.r / 255f;
                        inputData[1 * YoloInputSize * YoloInputSize + baseIndex] = pixel.g / 255f;
                        inputData[2 * YoloInputSize * YoloInputSize + baseIndex] = pixel.b / 255f;
                    }
                }
            }

            return new Tensor(1, 3, YoloInputSize, YoloInputSize, inputData);
        }

        private void ParseYoloOutput(Tensor boxes, Tensor scores, Tensor indices, int originalWidth, int originalHeight, List<PersonDetection> detections)
        {
            var indicesShape = indices.shape.ToArray();
            var indicesCount = indicesShape[1];
            var indicesWidth = indicesShape[2];

            var scoresShape = scores.shape.ToArray();
            var scoresWidth = scoresShape[2];

            var boxesShape = boxes.shape.ToArray();
            var boxesWidth = boxesShape[2];

            for (var i = 0; i < indicesCount; i++)
            {
                var classIndex = (int)indices[i * indicesWidth + 1];
                if (classIndex != PersonClassIndex)
                {
                    continue;
                }

                var boxIndex = (int)indices[i * indicesWidth + 2];
                var confidence = scores[PersonClassIndex * scoresWidth + boxIndex];

                if (confidence < confidenceThreshold)
                {
                    continue;
                }

                var y1 = boxes[boxIndex * boxesWidth + 0];
                var x1 = boxes[boxIndex * boxesWidth + 1];
                var y2 = boxes[boxIndex * boxesWidth + 2];
                var x2 = boxes[boxIndex * boxesWidth + 3];

                var centerX = (x1 + x2) / 2f / originalWidth;
                var centerY = (y1 + y2) / 2f / originalHeight;
                var boxWidth = (x2 - x1) / originalWidth;
                var boxHeight = (y2 - y1) / originalHeight;

                detections.Add(new PersonDetection
                {
                    Center = new Vector2(centerX, centerY),
                    Size = new Vector2(boxWidth, boxHeight),
                    Confidence = confidence
                });
            }
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
