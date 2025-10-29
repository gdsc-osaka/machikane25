using System;
using System.Collections.Generic;
using OpenCvSharp;
using UnityEngine;

namespace Art.Visitors
{
    /// <summary>
    /// Processes camera frames with OpenCV to derive visitor clusters and smoothing.
    /// </summary>
    internal sealed class VisitorDetectionProcessor : IDisposable
    {
        private readonly float mergeDistance;
        private readonly float mergeDistanceSquared;
        private readonly float minContourArea;
        private readonly double thresholdValue;
        private readonly double learningRate;
        private readonly float smoothingSpeed;
        private readonly float absenceDamping;
        private readonly Size blurKernelSize;
        private readonly Mat morphKernel;

        private readonly BackgroundSubtractorMOG2 backgroundSubtractor;
        private readonly Mat grayMat = new Mat();
        private readonly Mat blurredMat = new Mat();
        private readonly Mat maskMat = new Mat();
        private readonly Mat rgbBuffer = new Mat();

        private bool disposed;

        private readonly List<ClusterAccumulator> clusterScratch = new List<ClusterAccumulator>();
        private readonly List<VisitorGroup> rawGroups = new List<VisitorGroup>();
        private readonly List<VisitorGroup> smoothedGroups = new List<VisitorGroup>();
        private readonly List<SmoothEntry> smoothEntries = new List<SmoothEntry>();

        public VisitorDetectionProcessor(float mergeDistance, float minContourArea, float detectionThreshold, float backgroundLerp, int sampleStride, float smoothingSpeed, float absenceDamping)
        {
            this.mergeDistance = Mathf.Max(0.01f, mergeDistance);
            mergeDistanceSquared = this.mergeDistance * this.mergeDistance;
            this.minContourArea = Mathf.Max(1f, minContourArea);
            thresholdValue = Mathf.Clamp01(detectionThreshold) * 255.0;
            learningRate = Mathf.Clamp01(backgroundLerp);
            this.smoothingSpeed = Mathf.Max(0.01f, smoothingSpeed);
            this.absenceDamping = Mathf.Max(0.01f, absenceDamping);

            var kernelSize = Mathf.Max(3, sampleStride);
            if (kernelSize % 2 == 0)
            {
                kernelSize += 1;
            }

            blurKernelSize = new Size(kernelSize, kernelSize);
            morphKernel = Cv2.GetStructuringElement(MorphShapes.Rect, new Size(kernelSize, kernelSize));
            backgroundSubtractor = BackgroundSubtractorMOG2.Create();
            backgroundSubtractor.History = 200;
            backgroundSubtractor.VarThreshold = 16;
        }

        public IReadOnlyList<VisitorGroup> Process(WebCamTexture webcam, Func<Vector2, Vector2> projector)
        {
            if (webcam == null)
            {
                return Array.Empty<VisitorGroup>();
            }

            using var frame = OpenCvSharp.Unity.TextureToMat(webcam);
            return Process(frame, webcam.width, webcam.height, Time.unscaledDeltaTime, Time.unscaledTime, projector);
        }

        public IReadOnlyList<VisitorGroup> Process(Color32[] pixels, int width, int height, float deltaTime, float timestamp, Func<Vector2, Vector2> projector)
        {
            if (pixels == null || pixels.Length < width * height)
            {
                return Array.Empty<VisitorGroup>();
            }

            rgbBuffer.Create(height, width, MatType.CV_8UC3);
            var index = 0;
            for (var y = 0; y < height; y++)
            {
                for (var x = 0; x < width; x++)
                {
                    var colour = pixels[index++];
                    rgbBuffer.Set(y, x, new Vec3b(colour.b, colour.g, colour.r));
                }
            }

            return Process(rgbBuffer, width, height, deltaTime, timestamp, projector);
        }

        private IReadOnlyList<VisitorGroup> Process(Mat frame, int width, int height, float deltaTime, float timestamp, Func<Vector2, Vector2> projector)
        {
            if (frame == null || frame.Empty())
            {
                return Array.Empty<VisitorGroup>();
            }

            ExtractVisitors(frame, width, height, projector);
            Smooth(timestamp, deltaTime);
            return smoothedGroups;
        }

        public void Reset()
        {
            smoothEntries.Clear();
            smoothedGroups.Clear();
            rawGroups.Clear();
            clusterScratch.Clear();
            backgroundSubtractor.Clear();
        }

        public void Dispose()
        {
            if (disposed)
            {
                return;
            }

            disposed = true;
            backgroundSubtractor?.Dispose();
            grayMat.Dispose();
            blurredMat.Dispose();
            maskMat.Dispose();
            rgbBuffer.Dispose();
            morphKernel.Dispose();
        }

        private void ExtractVisitors(Mat frame, int width, int height, Func<Vector2, Vector2> projector)
        {
            rawGroups.Clear();
            clusterScratch.Clear();

            Cv2.CvtColor(frame, grayMat, ColorConversionCodes.BGR2GRAY);
            Cv2.GaussianBlur(grayMat, blurredMat, blurKernelSize, 0);
            backgroundSubtractor.Apply(blurredMat, maskMat, learningRate);

            if (thresholdValue > 0.0)
            {
                Cv2.Threshold(maskMat, maskMat, thresholdValue, 255, ThresholdTypes.Binary);
            }

            Cv2.MorphologyEx(maskMat, maskMat, MorphTypes.Open, morphKernel);
            Cv2.MorphologyEx(maskMat, maskMat, MorphTypes.Close, morphKernel);

            Cv2.FindContours(maskMat, out var contours, out _, RetrievalModes.External, ContourApproximationModes.Simple);
            var areaNormalizer = Mathf.Max(1f, width * height);

            for (var i = 0; i < contours.Length; i++)
            {
                var contour = contours[i];
                var contourArea = Cv2.ContourArea(contour);
                if (contourArea < minContourArea)
                {
                    continue;
                }

                var moments = Cv2.Moments(contour);
                if (Math.Abs(moments.M00) < double.Epsilon)
                {
                    continue;
                }

                var cx = (float)(moments.M10 / moments.M00);
                var cy = (float)(moments.M01 / moments.M00);

                var normalised = new Vector2(
                    width > 1 ? cx / (width - 1f) : 0f,
                    height > 1 ? cy / (height - 1f) : 0f);
                normalised.x = Mathf.Clamp01(normalised.x);
                normalised.y = Mathf.Clamp01(normalised.y);

                var magnitude = Mathf.Clamp01((float)(contourArea / areaNormalizer));
                AddCluster(normalised, magnitude);
            }

            rawGroups.Clear();
            for (var i = 0; i < clusterScratch.Count; i++)
            {
                var cluster = clusterScratch[i];
                var position = projector != null ? projector(cluster.Centroid) : cluster.Centroid;
                rawGroups.Add(new VisitorGroup(position, Mathf.Clamp01(cluster.TotalWeight)));
            }
        }

        private void AddCluster(Vector2 position, float weight)
        {
            for (var i = 0; i < clusterScratch.Count; i++)
            {
                var existing = clusterScratch[i];
                if (Vector2.SqrMagnitude(existing.Centroid - position) <= mergeDistanceSquared)
                {
                    existing.Add(position, weight);
                    clusterScratch[i] = existing;
                    return;
                }
            }

            clusterScratch.Add(ClusterAccumulator.From(position, weight));
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
                    var candidate = smoothEntries[j];
                    if (candidate.Marked)
                    {
                        continue;
                    }

                    var distance = Vector2.SqrMagnitude(candidate.Position - source.Position);
                    if (distance <= mergeDistanceSquared && distance < bestDistance)
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
                smoothedGroups.Add(new VisitorGroup(entry.Position, Mathf.Clamp01(entry.Magnitude)));
            }
        }

        private struct ClusterAccumulator
        {
            private Vector2 sum;
            private float totalWeight;

            public Vector2 Centroid => totalWeight > Mathf.Epsilon ? sum / totalWeight : sum;

            public float TotalWeight => totalWeight;

            public void Add(Vector2 point, float weight)
            {
                sum += point * weight;
                totalWeight += weight;
            }

            public static ClusterAccumulator From(Vector2 point, float weight)
            {
                var accumulator = new ClusterAccumulator();
                accumulator.Add(point, weight);
                return accumulator;
            }
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
