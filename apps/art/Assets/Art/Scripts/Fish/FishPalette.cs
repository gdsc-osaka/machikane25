using UnityEngine;

namespace Art.Fish
{
    /// <summary>
    /// Provides consistent application of backend-provided hue values onto runtime materials.
    /// </summary>
    public static class FishPalette
    {
        private static readonly int TintId = Shader.PropertyToID("_Tint");
        private static readonly int ColorId = Shader.PropertyToID("_Color");
        private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");

        public static void ApplyHue(Material material, Color tint)
        {
            if (material == null)
            {
                return;
            }

            var clamped = new Color(
                Mathf.Clamp01(tint.r),
                Mathf.Clamp01(tint.g),
                Mathf.Clamp01(tint.b),
                Mathf.Clamp01(tint.a));

            if (material.HasProperty(TintId))
            {
                material.SetColor(TintId, clamped);
            }

            if (material.HasProperty(ColorId))
            {
                material.SetColor(ColorId, clamped);
            }

            if (material.HasProperty(BaseColorId))
            {
                material.SetColor(BaseColorId, clamped);
            }
        }
    }
}
