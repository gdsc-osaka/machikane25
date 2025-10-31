using System;
using System.Collections.Generic;
using UnityEngine;

namespace Art.Visitors
{
    /// <summary>
    /// Processes camera frames, extracts visitor clusters, and maintains smoothed centroids.
    /// </summary>
    internal sealed class VisitorDetectionProcessor
    {
        private readonly float mergeDistance;
        private readonly float mergeDistanceSquared;
        private readonly float minClusterArea;
        private readonly float detectionThreshold;
        private readonly float backgroundLerp;
        private readonly int sampleStride;
        private readonly float smoothingSpeed;
        private readonly float absenceDamping;

        private float[] backgroundLuma;
        private Color32[] frameBuffer;
        private bool backgroundInitialised;

        private readonly List<VisitorPoint> candidatePoints = new List<VisitorPoint>();
        private readonly List<ClusterAccumulator> clusterScratch = new List<ClusterAccumulator>();
        private readonly List<VisitorGroup> rawGroups = new List<VisitorGroup>();
        private readonly List<VisitorGroup> smoothedGroups = new List<VisitorGroup>();
        private readonly List<SmoothEntry> smoothEntries = new List<SmoothEntry>();

        public VisitorDetectionProcessor(float mergeDistance, float minClusterArea, float detectionThreshold, float backgroundLerp, int sampleStride, float smoothingSpeed, float absenceDamping)
        {
            this.mergeDistance = Mathf.Max(0.01f, mergeDistance);
            mergeDistanceSquared = this.mergeDistance * this.mergeDistance;
            this.minClusterArea = Mathf.Max(1f, minClusterArea);
            this.detectionThreshold = Mathf.Clamp01(detectionThreshold);
            this.backgroundLerp = Mathf.Clamp01(backgroundLerp);
            this.sampleStride = Mathf.Max(1, sampleStride);
            this.smoothingSpeed = Mathf.Max(0.01f, smoothingSpeed);
            this.absenceDamping = Mathf.Max(0.01f, absenceDamping);
        }

        public IReadOnlyList<VisitorGroup> Process(WebCamTexture webcam, Func<Vector2, Vector2> projector)
        {
            if (webcam == null)
            {
                return Array.Empty<VisitorGroup>();
            }

            var width = Mathf.Max(1, webcam.width);
            var height = Mathf.Max(1, webcam.height);
            EnsureCapacity(width * height);

            if (frameBuffer == null || frameBuffer.Length != width * height)
            {
                frameBuffer = new Color32[width * height];
            }

            webcam.GetPixels32(frameBuffer);
            return Process(frameBuffer, width, height, Time.unscaledDeltaTime, Time.unscaledTime, projector);
        }

        public IReadOnlyList<VisitorGroup> Process(Color32[] pixels, int width, int height, float deltaTime, float timestamp, Func<Vector2, Vector2> projector)
        {
            if (pixels == null || pixels.Length < width * height)
            {
                return Array.Empty<VisitorGroup>();
            }

            EnsureCapacity(width * height);

            candidatePoints.Clear();
            rawGroups.Clear();

            var areaPerSample = sampleStride * sampleStride;
            var requiredWeight = minClusterArea / areaPerSample;

            CollectForegroundPoints(pixels, width, height, areaPerSample);
            BuildClusters(requiredWeight);
            ProjectClusters(projector, width, height, areaPerSample);
            Smooth(timestamp, deltaTime);

            return smoothedGroups;
        }

        public void Reset()
        {
            backgroundInitialised = false;
            if (backgroundLuma != null)
            {
                Array.Clear(backgroundLuma, 0, backgroundLuma.Length);
            }

            candidatePoints.Clear();
            clusterScratch.Clear();
            rawGroups.Clear();
            smoothedGroups.Clear();
            smoothEntries.Clear();
        }

        private void EnsureCapacity(int pixelCount)
        {
            if (backgroundLuma == null || backgroundLuma.Length != pixelCount)
            {
                backgroundLuma = new float[pixelCount];
                backgroundInitialised = false;
            }
        }

        private void CollectForegroundPoints(Color32[] pixels, int width, int height, int areaPerSample)
        {
            var stride = sampleStride;
            for (var y = 0; y < height; y += stride)
            {
                for (var x = 0; x < width; x += stride)
                {
                    var index = y * width + x;
                    var luma = GetLuminance(pixels[index]);

                    if (!backgroundInitialised)
                    {
                        backgroundLuma[index] = luma;
                        continue;
                    }

                    var backgroundValue = backgroundLuma[index];
                    var difference = Mathf.Abs(luma - backgroundValue);
                    backgroundLuma[index] = Mathf.Lerp(backgroundValue, luma, backgroundLerp);

                    if (difference < detectionThreshold)
                    {
                        continue;
                    }

                    var normalisedX = width > 1 ? (float)x / (width - 1) : 0f;
                    var normalisedY = height > 1 ? (float)y / (height - 1) : 0f;
                    candidatePoints.Add(new VisitorPoint(new Vector2(normalisedX, normalisedY), difference * areaPerSample));
                }
            }

            backgroundInitialised = true;
        }

        private void BuildClusters(float requiredWeight)
        {
            clusterScratch.Clear();
            if (candidatePoints.Count == 0)
            {
                return;
            }

            for (var i = 0; i < candidatePoints.Count; i++)
            {
                var point = candidatePoints[i];
                var assigned = false;
                for (var j = 0; j < clusterScratch.Count; j++)
                {
                    var cluster = clusterScratch[j];
                    if (Vector2.SqrMagnitude(cluster.Centroid - point.Position) <= mergeDistanceSquared)
                    {
                        cluster.Add(point.Position, point.Weight);
                        clusterScratch[j] = cluster;
                        assigned = true;
                        break;
                    }
                }

                if (!assigned)
                {
                    clusterScratch.Add(ClusterAccumulator.From(point.Position, point.Weight));
                }
            }

            for (var i = clusterScratch.Count - 1; i >= 0; i--)
            {
                if (clusterScratch[i].TotalWeight < requiredWeight)
                {
                    clusterScratch.RemoveAt(i);
                }
            }
        }

        private void ProjectClusters(Func<Vector2, Vector2> projector, int width, int height, int areaPerSample)
        {
            rawGroups.Clear();
            for (var i = 0; i < clusterScratch.Count; i++)
            {
                var cluster = clusterScratch[i];
                var centroid = cluster.Centroid;
                var mapped = projector != null ? projector(centroid) : centroid;
                var magnitude = Mathf.Clamp01(cluster.TotalWeight / (width * height));
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

        private static float GetLuminance(Color32 color)
        {
            return (0.2989f * color.r + 0.587f * color.g + 0.114f * color.b) / 255f;
        }

        private readonly struct VisitorPoint
        {
            public VisitorPoint(Vector2 position, float weight)
            {
                Position = position;
                Weight = weight;
            }

            public Vector2 Position { get; }

            public float Weight { get; }
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
                var cluster = new ClusterAccumulator();
                cluster.Add(point, weight);
                return cluster;
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
