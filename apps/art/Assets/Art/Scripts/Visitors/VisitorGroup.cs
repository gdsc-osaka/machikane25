using UnityEngine;

namespace Art.Visitors
{
    /// <summary>
    /// Represents a detected visitor cluster mapped into calibrated screen space.
    /// </summary>
    public readonly struct VisitorGroup
    {
        public VisitorGroup(Vector2 position, float magnitude)
        {
            Position = position;
            Magnitude = Mathf.Max(0f, magnitude);
        }

        public Vector2 Position { get; }

        public float Magnitude { get; }

        public VisitorGroup WithMagnitude(float magnitude)
        {
            return new VisitorGroup(Position, magnitude);
        }

        public static VisitorGroup Lerp(VisitorGroup a, VisitorGroup b, float t)
        {
            var clampedT = Mathf.Clamp01(t);
            var position = Vector2.Lerp(a.Position, b.Position, clampedT);
            var magnitude = Mathf.Lerp(a.Magnitude, b.Magnitude, clampedT);
            return new VisitorGroup(position, magnitude);
        }
    }
}
