using UnityEngine;

namespace Art.Fish
{
    [CreateAssetMenu(fileName = "BoidSettings", menuName = "Art/Boid Settings")]
    public class BoidSettings : ScriptableObject
    {
        [Header("Speed")]
        public float MinSpeed = 2f;
        public float MaxSpeed = 5f;
        public float MaxSteerForce = 3f;

        [Header("Perception")]
        [Tooltip("Radius for alignment and cohesion")]
        public float PerceptionRadius = 5f;
        [Tooltip("Radius for separation")]
        public float AvoidanceRadius = 1f;

        [Header("Animation")]
        [Tooltip("Base speed for the fish's animator controller")]
        public float AnimationSpeed = 1f; // New field
    }
}