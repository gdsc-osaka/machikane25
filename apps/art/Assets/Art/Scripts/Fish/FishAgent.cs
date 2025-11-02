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
        private Vector3 visitorSteering;

        private BoidSettings _settings;
        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int IsSwimmingHash = Animator.StringToHash("IsSwimming");

        public FishState CurrentState => currentState;

        private void Awake()
        {
            EnsureRuntimeMaterial();
            if (animator == null)
            {
                animator = GetComponent<Animator>();
            }
        }

        public void Configure(BoidSettings settings)
        {
            // Store settings for use in UpdateVelocity
            _settings = settings;

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

        /// <summary>
        /// Updates the animator's 'Speed' parameter based on current velocity.
        /// Assumes the Animator has a float parameter named "Speed".
        /// </summary>
        public void UpdateVelocity(Vector3 velocity)
        {
            if (animator == null || _settings == null) return;

            float speed = velocity.magnitude;
            
            // Normalize speed (0.0 to 1.0) based on min/max
            float normalizedSpeed = Mathf.InverseLerp(_settings.MinSpeed, _settings.MaxSpeed, speed);
            
            // Set the "Speed" parameter in your Animator Controller
            animator.SetFloat(SpeedHash, normalizedSpeed);
        }

        /// <summary>
        /// Gets the visitor steering force and clears it.
        /// </summary>
        public Vector3 ConsumeVisitorSteering()
        {
            Vector3 steering = visitorSteering;
            visitorSteering = Vector3.zero; // Clear after consumption
            return steering;
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
                // Assuming a FishPalette helper class exists to apply the Color
                // e.g., FishPalette.ApplyTint(runtimeMaterial, state.Tint);
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

            animator.SetBool(IsSwimmingHash, isSwimming);
        }

        public void ApplyVisitorSteering(Vector3 steering)
        {
            Debug.Log($"Applying visitor steering {steering} to fish {gameObject.name}");
            visitorSteering = steering;
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