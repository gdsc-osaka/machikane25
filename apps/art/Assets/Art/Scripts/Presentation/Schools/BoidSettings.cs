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

        [Header("Boid Force Weights")]
        [SerializeField] [Range(0f, 5f)] private float separationWeight = 1.5f;
        [SerializeField] [Range(0f, 5f)] private float alignmentWeight = 1.0f;
        [SerializeField] [Range(0f, 5f)] private float cohesionWeight = 1.0f;
        [SerializeField] [Range(0f, 5f)] private float visitorAttractionWeight = 2.0f;

        public float MinSpeed => minSpeed;
        public float MaxSpeed => maxSpeed;
        public float NeighbourRadius => neighbourRadius;
        public float AvoidanceRadius => avoidanceRadius;
        public float AnimationSpeed => animationSpeed;

        public float SeparationWeight => separationWeight;
        public float AlignmentWeight => alignmentWeight;
        public float CohesionWeight => cohesionWeight;
        public float VisitorAttractionWeight => visitorAttractionWeight;

        private void OnValidate()
        {
            minSpeed = Mathf.Max(0f, minSpeed);
            maxSpeed = Mathf.Max(minSpeed, maxSpeed);
            neighbourRadius = Mathf.Max(0f, neighbourRadius);
            avoidanceRadius = Mathf.Clamp(avoidanceRadius, 0f, neighbourRadius);
            animationSpeed = Mathf.Max(0f, animationSpeed);
        }
    }
}
