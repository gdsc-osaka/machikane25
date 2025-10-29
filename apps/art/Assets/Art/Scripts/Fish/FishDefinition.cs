using UnityEngine;

namespace Art.Fish
{
    /// <summary>
    /// ScriptableObject describing how a fish prefab should be instantiated and skinned.
    /// </summary>
    [CreateAssetMenu(menuName = "Art/Fish Definition", fileName = "FishDefinition")]
    public sealed class FishDefinition : ScriptableObject
    {
        [SerializeField] private FishAgent prefab;
        [SerializeField] private Material baseMaterial;
        [SerializeField] private Texture2D placeholderTexture;
        [SerializeField] [Range(0.1f, 5f)] private float spawnScale = 1f;

        public FishAgent Prefab => prefab;

        public Material BaseMaterial => baseMaterial;

        public Texture2D PlaceholderTexture => placeholderTexture;

        public float SpawnScale => spawnScale;
    }
}
