using System;
using NUnit.Framework;
using UnityEngine;

namespace Art.Visitors.Tests
{
    [TestFixture]
    public sealed class VisitorDetectorTests
    {
        private VisitorDetectionProcessor processor;

        [SetUp]
        public void SetUp()
        {
            processor = new VisitorDetectionProcessor(0.15f, 12f, 0.18f, 0.1f, 1, 8f, 4f);
        }

        [TearDown]
        public void TearDown()
        {
            processor.Dispose();
        }

        [Test]
        public void Process_WithForegroundCluster_ReturnsVisitorNearCentroid()
        {
            const int width = 32;
            const int height = 18;
            var baseline = CreateFrame(width, height, new Color32(10, 10, 10, 255));
            var firstPass = processor.Process(baseline, width, height, 1f / 30f, 0f, IdentityProjector);
            Assert.That(firstPass, Is.Empty);

            var foreground = CreateFrame(width, height, new Color32(10, 10, 10, 255));
            PaintRect(foreground, width, height, 10, 5, 12, 8, new Color32(240, 240, 240, 255));

            var detections = processor.Process(foreground, width, height, 1f / 30f, 0.1f, IdentityProjector);
            Assert.That(detections, Has.Count.EqualTo(1));

            var visitor = detections[0];
            Assert.That(visitor.Magnitude, Is.GreaterThan(0.01f));
            Assert.That(visitor.Position.x, Is.EqualTo(0.5f).Within(0.2f));
            Assert.That(visitor.Position.y, Is.EqualTo(0.5f).Within(0.2f));
        }

        [Test]
        public void Process_MultipleClusters_ReturnsDistinctVisitors()
        {
            const int width = 48;
            const int height = 24;
            var baseline = CreateFrame(width, height, new Color32(5, 5, 5, 255));
            processor.Process(baseline, width, height, 1f / 30f, 0f, IdentityProjector);

            var foreground = CreateFrame(width, height, new Color32(5, 5, 5, 255));
            PaintRect(foreground, width, height, 8, 4, 8, 8, new Color32(220, 220, 220, 255));
            PaintRect(foreground, width, height, 30, 10, 8, 8, new Color32(220, 220, 220, 255));

            var detections = processor.Process(foreground, width, height, 1f / 30f, 0.1f, IdentityProjector);
            Assert.That(detections, Has.Count.EqualTo(2));

            Assert.That(detections[0].Position.x, Is.LessThan(detections[1].Position.x));
        }

        [Test]
        public void Process_NoVisitorsAfterDecay_EmitsEmpty()
        {
            const int width = 32;
            const int height = 18;
            var baseline = CreateFrame(width, height, new Color32(0, 0, 0, 255));
            processor.Process(baseline, width, height, 1f / 60f, 0f, IdentityProjector);

            var foreground = CreateFrame(width, height, new Color32(0, 0, 0, 255));
            PaintRect(foreground, width, height, 9, 5, 6, 6, new Color32(255, 255, 255, 255));
            processor.Process(foreground, width, height, 1f / 60f, 0.05f, IdentityProjector);

            var empty = CreateFrame(width, height, new Color32(0, 0, 0, 255));
            processor.Process(empty, width, height, 1f / 60f, 0.1f, IdentityProjector);
            var detections = processor.Process(empty, width, height, 1f / 60f, 0.2f, IdentityProjector);

            Assert.That(detections, Is.Empty);
        }

        private static Vector2 IdentityProjector(Vector2 input)
        {
            return input;
        }

        private static Color32[] CreateFrame(int width, int height, Color32 fill)
        {
            var frame = new Color32[width * height];
            for (var i = 0; i < frame.Length; i++)
            {
                frame[i] = fill;
            }

            return frame;
        }

        private static void PaintRect(Color32[] pixels, int width, int height, int startX, int startY, int rectWidth, int rectHeight, Color32 color)
        {
            var maxX = Mathf.Clamp(startX + rectWidth, 0, width);
            var maxY = Mathf.Clamp(startY + rectHeight, 0, height);
            var minX = Mathf.Clamp(startX, 0, width);
            var minY = Mathf.Clamp(startY, 0, height);

            for (var y = minY; y < maxY; y++)
            {
                for (var x = minX; x < maxX; x++)
                {
                    pixels[y * width + x] = color;
                }
            }
        }
    }
}
