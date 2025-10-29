using UnityEngine;

namespace Art.Rare
{
    /// <summary>
    /// Defines a rare character variant with its prefab, audio, visual effects, and spawn weight.
    /// </summary>
    [CreateAssetMenu(menuName = "Art/Rare/Rare Character Definition", fileName = "RareCharacter")]
    public sealed class RareCharacterDefinition : ScriptableObject
    {
        [Header("Prefab")]
        [Tooltip("The rare character prefab to spawn.")]
        public GameObject prefab;

        [Header("Audio")]
        [Tooltip("Sound effect to play when this rare character spawns.")]
        public AudioClip spawnSfx;

        [Header("Spawn Weight")]
        [Tooltip("Relative probability weight for selecting this rare character. Higher values = more likely to spawn.")]
        [Range(0f, 1f)]
        public float weight = 0.1f;

        [Header("Behavior")]
        [Tooltip("Strength of the attractor force this rare character exerts on regular fish.")]
        [Range(0f, 10f)]
        public float attractorStrength = 2.0f;

        [Tooltip("Duration in seconds before this rare character despawns. 0 = infinite.")]
        public float lifetimeSeconds = 60f;

        private void OnValidate()
        {
            if (weight < 0f)
            {
                weight = 0f;
            }

            if (weight > 1f)
            {
                weight = 1f;
            }

            if (attractorStrength < 0f)
            {
                attractorStrength = 0f;
            }

            if (lifetimeSeconds < 0f)
            {
                lifetimeSeconds = 0f;
            }
        }
    }
}
