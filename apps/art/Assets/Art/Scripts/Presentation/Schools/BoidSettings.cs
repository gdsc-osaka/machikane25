using UnityEngine;

namespace Art.Presentation.Schools
{
    /// <summary>
    /// Designer-tuneable parameters that control boid behaviour.
    /// </summary>
    [CreateAssetMenu(menuName = "Art/Presentation/Boid Settings", fileName = "BoidSettings")]
    public sealed class BoidSettings : ScriptableObject
    {
        [SerializeField] private float minSpeed = 1.5f;
        [SerializeField] private float maxSpeed = 3.5f;
        [SerializeField] private float neighbourRadius = 3f;
        [SerializeField] private float avoidanceRadius = 1f;
        [SerializeField] private float animationSpeed = 1f;
        [SerializeField] private float cohesionWeight = 1.2f;
        [SerializeField] private float alignmentWeight = 1f;
        [SerializeField] private float separationWeight = 1.5f;
        [SerializeField] private float targetAttractionWeight = 2f;
        [SerializeField] private float noiseWeight = 0.35f;
        [SerializeField] private float maxSteeringForce = 6f;

        public float MinSpeed => minSpeed;
        public float MaxSpeed => maxSpeed;
        public float NeighbourRadius => neighbourRadius;
        public float AvoidanceRadius => avoidanceRadius;
        public float AnimationSpeed => animationSpeed;
        public float CohesionWeight => cohesionWeight;
        public float AlignmentWeight => alignmentWeight;
        public float SeparationWeight => separationWeight;
        public float TargetAttractionWeight => targetAttractionWeight;
        public float NoiseWeight => noiseWeight;
        public float MaxSteeringForce => maxSteeringForce;

        private void OnValidate()
        {
            minSpeed = Mathf.Max(0f, minSpeed);
            maxSpeed = Mathf.Max(minSpeed, maxSpeed);
            neighbourRadius = Mathf.Max(0f, neighbourRadius);
            avoidanceRadius = Mathf.Clamp(avoidanceRadius, 0f, neighbourRadius);
            animationSpeed = Mathf.Max(0f, animationSpeed);
            cohesionWeight = Mathf.Max(0f, cohesionWeight);
            alignmentWeight = Mathf.Max(0f, alignmentWeight);
            separationWeight = Mathf.Max(0f, separationWeight);
            targetAttractionWeight = Mathf.Max(0f, targetAttractionWeight);
            noiseWeight = Mathf.Max(0f, noiseWeight);
            maxSteeringForce = Mathf.Max(0.01f, maxSteeringForce);
        }
    }
}
