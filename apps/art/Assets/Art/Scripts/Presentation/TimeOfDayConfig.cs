using UnityEngine;

namespace Art.Presentation
{
    /// <summary>
    /// Configuration for the time-of-day lighting system.
    /// Defines periods (day, sunset, night) and timing behavior.
    /// </summary>
    [CreateAssetMenu(fileName = "TimeOfDayConfig", menuName = "Art/TimeOfDay Config", order = 1)]
    public class TimeOfDayConfig : ScriptableObject
    {
        [Header("Time Mode")]
        [Tooltip("How to determine the current time of day")]
        public TimeMode timeMode = TimeMode.AutomaticCycle;

        [Tooltip("Duration in seconds for a full day cycle (only used in Automatic mode)")]
        [Range(60f, 3600f)]
        public float cycleDurationSeconds = 600f; // 10 minutes default

        [Header("Periods")]
        [Tooltip("Day period settings (typically 6:00 AM - 5:00 PM)")]
        public TimeOfDayPeriod dayPeriod;

        [Tooltip("Sunset period settings (typically 5:00 PM - 8:00 PM)")]
        public TimeOfDayPeriod sunsetPeriod;

        [Tooltip("Night period settings (typically 8:00 PM - 6:00 AM)")]
        public TimeOfDayPeriod nightPeriod;

        [Header("Timing (for RealTime mode)")]
        [Tooltip("Hour when day starts (24-hour format)")]
        [Range(0, 23)]
        public int dayStartHour = 6;

        [Tooltip("Hour when sunset starts (24-hour format)")]
        [Range(0, 23)]
        public int sunsetStartHour = 17;

        [Tooltip("Hour when night starts (24-hour format)")]
        [Range(0, 23)]
        public int nightStartHour = 20;

        [Header("Transitions")]
        [Tooltip("Duration in seconds for transitions between periods")]
        [Range(1f, 60f)]
        public float transitionDurationSeconds = 10f;

        public enum TimeMode
        {
            /// <summary>
            /// Cycles through day/sunset/night automatically based on cycleDurationSeconds
            /// </summary>
            AutomaticCycle,

            /// <summary>
            /// Uses system time to determine current period
            /// </summary>
            RealTime
        }

        /// <summary>
        /// Gets the appropriate period based on the given hour (0-23)
        /// </summary>
        public TimeOfDayPeriod GetPeriodForHour(int hour)
        {
            if (hour >= dayStartHour && hour < sunsetStartHour)
            {
                return dayPeriod;
            }
            else if (hour >= sunsetStartHour && hour < nightStartHour)
            {
                return sunsetPeriod;
            }
            else
            {
                return nightPeriod;
            }
        }

        /// <summary>
        /// Gets the appropriate period based on normalized time (0-1, where 0 is midnight, 0.5 is noon)
        /// </summary>
        public TimeOfDayPeriod GetPeriodForNormalizedTime(float normalizedTime)
        {
            float hour = normalizedTime * 24f;
            return GetPeriodForHour(Mathf.FloorToInt(hour));
        }
    }
}
