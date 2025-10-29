using UnityEngine;

namespace Art.Presentation.Schools
{
    /// <summary>
    /// Tuneable parameters that map visitor detections into boid steering forces.
    /// </summary>
    [CreateAssetMenu(menuName = "Art/Presentation/Visitor Influence Settings", fileName = "VisitorInfluenceSettings")]
    public sealed class VisitorInfluenceSettings : ScriptableObject
    {
        [SerializeField] private Vector2 planeExtents = new Vector2(12f, 6f);
        [SerializeField] private Vector2 planePivot = new Vector2(0.5f, 0.5f);
        [SerializeField] private float planeHeight;
        [SerializeField] private float attractionStrength = 4f;
        [SerializeField] private float maxDistance = 10f;
        [SerializeField] private float falloffPower = 1.5f;
        [SerializeField] private float steeringResponsiveness = 6f;
        [SerializeField] private float absenceDamping = 3f;
        [SerializeField] private float minimumMagnitude = 0.05f;

        public Vector3 ToWorldPosition(Vector2 normalised)
        {
            var centred = new Vector2(normalised.x - planePivot.x, normalised.y - planePivot.y);
            var x = centred.x * planeExtents.x;
            var z = centred.y * planeExtents.y;
            return new Vector3(x, planeHeight, z);
        }

        public float AttractionStrength => attractionStrength;

        public float MaxDistance => maxDistance;

        public float FalloffPower => Mathf.Max(0.01f, falloffPower);

        public float SteeringResponsiveness => steeringResponsiveness;

        public float AbsenceDamping => absenceDamping;

        public float MinimumMagnitude => minimumMagnitude;

        public Vector2 PlaneExtents => planeExtents;

        public Vector2 PlanePivot => planePivot;

        public float PlaneHeight => planeHeight;

        private void OnValidate()
        {
            planeExtents.x = Mathf.Max(0.1f, planeExtents.x);
            planeExtents.y = Mathf.Max(0.1f, planeExtents.y);
            attractionStrength = Mathf.Max(0f, attractionStrength);
            maxDistance = Mathf.Max(0.1f, maxDistance);
            falloffPower = Mathf.Max(0.01f, falloffPower);
            steeringResponsiveness = Mathf.Max(0.01f, steeringResponsiveness);
            absenceDamping = Mathf.Max(0.01f, absenceDamping);
            minimumMagnitude = Mathf.Clamp01(minimumMagnitude);
            planePivot.x = Mathf.Clamp01(planePivot.x);
            planePivot.y = Mathf.Clamp01(planePivot.y);
        }
    }
}
