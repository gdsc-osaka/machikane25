using Art.Presentation.Schools;
using UnityEngine;

namespace Art.Fish
{
    /// <summary>
    /// MonoBehaviour responsible for applying textures, tint, and boid settings to an instantiated fish prefab.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class FishAgent : MonoBehaviour
    {
        [SerializeField] private Renderer bodyRenderer;
        [SerializeField] private Animator animator;
        [SerializeField] [Tooltip("Optional multiplier applied on top of boid animation speed.")]
        private float animationSpeedMultiplier = 1f;

        private Material runtimeMaterial;
        private FishState currentState;
        private Texture2D appliedTexture;

        public FishState CurrentState => currentState;

        private void Awake()
        {
            EnsureRuntimeMaterial();
        }

        public void Configure(BoidSettings settings)
        {
            if (animator == null)
            {
                return;
            }

            if (settings != null)
            {
                animator.speed = settings.AnimationSpeed * animationSpeedMultiplier;
            }
            else
            {
                animator.speed = animationSpeedMultiplier;
            }
        }

        public void ApplyDefinition(FishDefinition definition)
        {
            if (definition == null)
            {
                return;
            }

            if (bodyRenderer != null)
            {
                if (definition.BaseMaterial != null)
                {
                    runtimeMaterial = new Material(definition.BaseMaterial)
                    {
                        name = $"{definition.BaseMaterial.name}_Instance"
                    };
                    bodyRenderer.material = runtimeMaterial;
                }
                else
                {
                    EnsureRuntimeMaterial();
                }

                if (definition.PlaceholderTexture != null)
                {
                    ApplyTexture(definition.PlaceholderTexture);
                }
            }

            if (definition.SpawnScale > Mathf.Epsilon)
            {
                transform.localScale = Vector3.one * definition.SpawnScale;
            }
        }

        public void ApplyState(FishState state, Texture2D texture)
        {
            currentState = state;

            if (texture != null)
            {
                ApplyTexture(texture);
            }

            if (runtimeMaterial != null && state != null)
            {
                FishPalette.ApplyHue(runtimeMaterial, state.Tint);
            }
        }

        public void ApplyTexture(Texture2D texture)
        {
            EnsureRuntimeMaterial();

            if (runtimeMaterial == null)
            {
                return;
            }

            appliedTexture = texture;

            if (runtimeMaterial.HasProperty("_MainTex"))
            {
                runtimeMaterial.SetTexture("_MainTex", texture);
            }

            if (runtimeMaterial.HasProperty("_BaseMap"))
            {
                runtimeMaterial.SetTexture("_BaseMap", texture);
            }
        }

        public void SetSwimming(bool isSwimming)
        {
            if (animator == null)
            {
                return;
            }

            animator.SetBool("IsSwimming", isSwimming);
        }

        public Texture2D GetAppliedTexture()
        {
            return appliedTexture;
        }

        private void EnsureRuntimeMaterial()
        {
            if (runtimeMaterial == null && bodyRenderer != null)
            {
                runtimeMaterial = bodyRenderer.material;
            }
        }
    }
}
