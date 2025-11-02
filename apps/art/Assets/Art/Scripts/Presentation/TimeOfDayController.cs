using System;
using UnityEngine;

namespace Art.Presentation
{
    /// <summary>
    /// Controls lighting and atmospheric effects based on time of day.
    /// Manages smooth transitions between day, sunset, and night periods.
    /// </summary>
    public class TimeOfDayController : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private TimeOfDayConfig config;

        [Header("Scene References")]
        [SerializeField] private Light directionalLight;

        [SerializeField]
        [Tooltip("Optional: Materials to apply water tint to (e.g., Ocean material)")]
        private Material[] waterMaterials;

        [SerializeField]
        [Tooltip("Optional: Property name for water color tint (e.g., '_Color', '_TintColor')")]
        private string waterColorProperty = "_Color";

        private float currentTime; // Normalized time [0-1]
        private TimeOfDayPeriod currentPeriod;
        private TimeOfDayPeriod targetPeriod;
        private float transitionProgress; // [0-1]
        private bool isTransitioning;

        public void Initialize(TimeOfDayConfig configuration)
        {
            config = configuration;

            if (config == null)
            {
                Debug.LogError("TimeOfDayController: Configuration is missing.", this);
                enabled = false;
                return;
            }

            if (directionalLight == null)
            {
                directionalLight = FindObjectOfType<Light>();
                if (directionalLight == null)
                {
                    Debug.LogWarning("TimeOfDayController: No directional light found in scene.", this);
                }
            }

            // Initialize based on time mode
            if (config.timeMode == TimeOfDayConfig.TimeMode.RealTime)
            {
                currentTime = GetNormalizedTimeFromSystem();
            }
            else
            {
                currentTime = 0.25f; // Start at morning (6 AM)
            }

            currentPeriod = config.GetPeriodForNormalizedTime(currentTime);
            targetPeriod = currentPeriod;
            ApplyPeriodSettings(currentPeriod, immediate: true);

            Debug.Log($"TimeOfDayController initialized in {config.timeMode} mode. Starting period: {currentPeriod.periodName}", this);
        }

        private void Update()
        {
            if (config == null)
            {
                return;
            }

            UpdateTime();
            UpdateLighting();
        }

        private void UpdateTime()
        {
            if (config.timeMode == TimeOfDayConfig.TimeMode.AutomaticCycle)
            {
                // Advance time based on cycle duration
                float timeIncrement = Time.deltaTime / config.cycleDurationSeconds;
                currentTime = (currentTime + timeIncrement) % 1f;
            }
            else if (config.timeMode == TimeOfDayConfig.TimeMode.RealTime)
            {
                // Update from system time
                currentTime = GetNormalizedTimeFromSystem();
            }

            // Check if we need to transition to a new period
            TimeOfDayPeriod newTargetPeriod = config.GetPeriodForNormalizedTime(currentTime);
            if (newTargetPeriod != targetPeriod && !isTransitioning)
            {
                StartTransition(newTargetPeriod);
            }
        }

        private void UpdateLighting()
        {
            if (isTransitioning)
            {
                transitionProgress += Time.deltaTime / config.transitionDurationSeconds;

                if (transitionProgress >= 1f)
                {
                    // Transition complete
                    transitionProgress = 1f;
                    currentPeriod = targetPeriod;
                    isTransitioning = false;
                }

                ApplyPeriodSettings(currentPeriod, targetPeriod, transitionProgress);
            }
        }

        private void StartTransition(TimeOfDayPeriod newPeriod)
        {
            currentPeriod = targetPeriod;
            targetPeriod = newPeriod;
            transitionProgress = 0f;
            isTransitioning = true;

            Debug.Log($"TimeOfDayController: Transitioning from {currentPeriod.periodName} to {targetPeriod.periodName}", this);
        }

        private void ApplyPeriodSettings(TimeOfDayPeriod period, bool immediate = false)
        {
            if (period == null)
            {
                return;
            }

            // Apply directional light settings
            if (directionalLight != null)
            {
                directionalLight.color = period.lightColor;
                directionalLight.intensity = period.lightIntensity;
                directionalLight.transform.rotation = Quaternion.Euler(period.lightRotation);
            }

            // Apply fog settings
            RenderSettings.fogColor = period.fogColor;
            RenderSettings.fogDensity = period.fogDensity;

            // Apply ambient lighting
            RenderSettings.ambientSkyColor = period.ambientSkyColor;
            RenderSettings.ambientEquatorColor = period.ambientEquatorColor;
            RenderSettings.ambientGroundColor = period.ambientGroundColor;

            // Apply water tint if enabled
            if (period.applyWaterTint && waterMaterials != null)
            {
                foreach (var material in waterMaterials)
                {
                    if (material != null && material.HasProperty(waterColorProperty))
                    {
                        material.SetColor(waterColorProperty, period.waterTint);
                    }
                }
            }
        }

        private void ApplyPeriodSettings(TimeOfDayPeriod from, TimeOfDayPeriod to, float t)
        {
            if (from == null || to == null)
            {
                return;
            }

            // Smooth interpolation using ease-in-out
            float smoothT = Mathf.SmoothStep(0f, 1f, t);

            // Interpolate directional light settings
            if (directionalLight != null)
            {
                directionalLight.color = Color.Lerp(from.lightColor, to.lightColor, smoothT);
                directionalLight.intensity = Mathf.Lerp(from.lightIntensity, to.lightIntensity, smoothT);

                Quaternion fromRotation = Quaternion.Euler(from.lightRotation);
                Quaternion toRotation = Quaternion.Euler(to.lightRotation);
                directionalLight.transform.rotation = Quaternion.Slerp(fromRotation, toRotation, smoothT);
            }

            // Interpolate fog settings
            RenderSettings.fogColor = Color.Lerp(from.fogColor, to.fogColor, smoothT);
            RenderSettings.fogDensity = Mathf.Lerp(from.fogDensity, to.fogDensity, smoothT);

            // Interpolate ambient lighting
            RenderSettings.ambientSkyColor = Color.Lerp(from.ambientSkyColor, to.ambientSkyColor, smoothT);
            RenderSettings.ambientEquatorColor = Color.Lerp(from.ambientEquatorColor, to.ambientEquatorColor, smoothT);
            RenderSettings.ambientGroundColor = Color.Lerp(from.ambientGroundColor, to.ambientGroundColor, smoothT);

            // Interpolate water tint if enabled
            if (from.applyWaterTint && to.applyWaterTint && waterMaterials != null)
            {
                Color waterColor = Color.Lerp(from.waterTint, to.waterTint, smoothT);
                foreach (var material in waterMaterials)
                {
                    if (material != null && material.HasProperty(waterColorProperty))
                    {
                        material.SetColor(waterColorProperty, waterColor);
                    }
                }
            }
        }

        private float GetNormalizedTimeFromSystem()
        {
            DateTime now = DateTime.Now;
            float hour = now.Hour + now.Minute / 60f + now.Second / 3600f;
            return hour / 24f;
        }

        // Editor helper for debugging
        [ContextMenu("Force Day")]
        private void ForceDay()
        {
            if (config != null && config.dayPeriod != null)
            {
                ApplyPeriodSettings(config.dayPeriod, immediate: true);
                Debug.Log("Forced to Day period", this);
            }
        }

        [ContextMenu("Force Sunset")]
        private void ForceSunset()
        {
            if (config != null && config.sunsetPeriod != null)
            {
                ApplyPeriodSettings(config.sunsetPeriod, immediate: true);
                Debug.Log("Forced to Sunset period", this);
            }
        }

        [ContextMenu("Force Night")]
        private void ForceNight()
        {
            if (config != null && config.nightPeriod != null)
            {
                ApplyPeriodSettings(config.nightPeriod, immediate: true);
                Debug.Log("Forced to Night period", this);
            }
        }
    }
}
