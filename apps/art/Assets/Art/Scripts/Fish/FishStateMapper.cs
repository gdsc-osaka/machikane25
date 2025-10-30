using System;
using System.Globalization;
using UnityEngine;

namespace Art.Fish
{
    /// <summary>
    /// Converts backend DTO payloads into domain-level <see cref="FishState"/> instances.
    /// </summary>
    public static class FishStateMapper
    {
        public static bool TryMap(FishDto dto, out FishState state, out string error)
        {
            state = null;
            error = null;

            if (dto == null)
            {
                error = "DTO was null.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(dto.id))
            {
                error = "DTO missing id.";
                return false;
            }

            if (!TryParseColor(dto.color, out var tint, out var colorError))
            {
                error = $"DTO {dto.id} failed colour parse: {colorError}";
                return false;
            }

            if (!TryParseCreatedAt(dto.createdAt, out var createdAtUtc, out var createdAtError))
            {
                error = $"DTO {dto.id} failed timestamp parse: {createdAtError}";
                return false;
            }

            state = new FishState(dto.id.Trim(), dto.imageUrl?.Trim() ?? string.Empty, tint, createdAtUtc);
            return true;
        }

        private static bool TryParseColor(string rawColor, out Color tint, out string error)
        {
            tint = Color.white;
            error = null;

            if (string.IsNullOrWhiteSpace(rawColor))
            {
                tint = Color.white;
                return true;
            }

            var candidate = rawColor.Trim();
            if (!candidate.StartsWith("#", StringComparison.Ordinal))
            {
                candidate = $"#{candidate}";
            }

            if (ColorUtility.TryParseHtmlString(candidate, out tint))
            {
                return true;
            }

            error = $"Invalid hex value '{rawColor}'.";
            return false;
        }

        private static bool TryParseCreatedAt(string rawTimestamp, out DateTime createdAtUtc, out string error)
        {
            createdAtUtc = DateTime.UtcNow;
            error = null;

            if (string.IsNullOrWhiteSpace(rawTimestamp))
            {
                error = "Missing createdAt value.";
                return false;
            }

            if (DateTime.TryParse(rawTimestamp, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out createdAtUtc))
            {
                return true;
            }

            error = $"Unrecognised ISO-8601 value '{rawTimestamp}'.";
            return false;
        }
    }
}