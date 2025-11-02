using UnityEngine;

namespace Art.Presentation
{
    /// <summary>
    /// Defines the lighting and atmospheric settings for a specific time of day period.
    /// </summary>
    [System.Serializable]
    public class TimeOfDayPeriod
    {
        [Header("Period Identity")]
        [Tooltip("Name of this period (e.g., 'Day', 'Sunset', 'Night')")]
        public string periodName = "Day";

        [Header("Sun/Directional Light")]
        [Tooltip("Color of the directional light (sun)")]
        public Color lightColor = Color.white;

        [Tooltip("Intensity of the directional light")]
        [Range(0f, 2f)]
        public float lightIntensity = 1f;

        [Tooltip("Euler angles for the directional light rotation (x = pitch, y = yaw)")]
        public Vector3 lightRotation = new Vector3(50f, -30f, 0f);

        [Header("Fog")]
        [Tooltip("Fog color")]
        public Color fogColor = new Color(0.5f, 0.7f, 0.9f, 1f);

        [Tooltip("Fog density (exponential mode)")]
        [Range(0f, 0.1f)]
        public float fogDensity = 0.015f;

        [Header("Ambient Lighting")]
        [Tooltip("Ambient sky color")]
        public Color ambientSkyColor = new Color(0.212f, 0.227f, 0.259f, 1f);

        [Tooltip("Ambient equator color")]
        public Color ambientEquatorColor = new Color(0.114f, 0.125f, 0.133f, 1f);

        [Tooltip("Ambient ground color")]
        public Color ambientGroundColor = new Color(0.047f, 0.043f, 0.035f, 1f);

        [Header("Water/Ocean (Optional)")]
        [Tooltip("If enabled, applies tint to water materials")]
        public bool applyWaterTint = false;

        [Tooltip("Water color tint")]
        public Color waterTint = new Color(0.2f, 0.4f, 0.6f, 1f);
    }
}
