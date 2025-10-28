using System;
using UnityEngine;

namespace Art.Fish
{
    /// <summary>
    /// Normalised fish data used across gameplay systems.
    /// </summary>
    public sealed class FishState : IEquatable<FishState>
    {
        public string Id { get; }
        public string ImageUrl { get; }
        public Color Tint { get; }
        public DateTime CreatedAt { get; }

        public FishState(string id, string imageUrl, Color tint, DateTime createdAt)
        {
            Id = id ?? throw new ArgumentNullException(nameof(id));
            ImageUrl = imageUrl ?? string.Empty;
            Tint = tint;
            CreatedAt = createdAt;
        }

        public bool Equals(FishState other)
        {
            if (ReferenceEquals(null, other))
            {
                return false;
            }

            if (ReferenceEquals(this, other))
            {
                return true;
            }

            return string.Equals(Id, other.Id, StringComparison.Ordinal) &&
                   string.Equals(ImageUrl, other.ImageUrl, StringComparison.Ordinal) &&
                   ColorsEqual(Tint, other.Tint) &&
                   CreatedAt == other.CreatedAt;
        }

        public override bool Equals(object obj)
        {
            return Equals(obj as FishState);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                var hash = 17;
                hash = (hash * 23) + Id.GetHashCode();
                hash = (hash * 23) + ImageUrl.GetHashCode();
                hash = (hash * 23) + Tint.GetHashCode();
                hash = (hash * 23) + CreatedAt.GetHashCode();
                return hash;
            }
        }

        private static bool ColorsEqual(Color a, Color b)
        {
            const float tolerance = 0.001f;
            return Mathf.Abs(a.r - b.r) <= tolerance &&
                   Mathf.Abs(a.g - b.g) <= tolerance &&
                   Mathf.Abs(a.b - b.b) <= tolerance &&
                   Mathf.Abs(a.a - b.a) <= tolerance;
        }
    }
}