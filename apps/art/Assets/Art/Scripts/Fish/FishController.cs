using UnityEngine;

namespace Art.Fish
{
    public class FishController : MonoBehaviour
    {
        public Animator animator;
        
        // Cache the animator parameter ID for efficiency
        private static readonly int SpeedHash = Animator.StringToHash("Speed");

        private void Awake()
        {
            if (animator == null)
            {
                animator = GetComponent<Animator>();
            }
        }

        /// <summary>
        /// Updates the animator's 'Speed' parameter based on current velocity.
        /// </summary>
        public void UpdateVelocity(Vector3 velocity, float minSpeed, float maxSpeed)
        {
            if (animator == null) return;
            
            float speed = velocity.magnitude;
            
            // Normalize speed (0.0 to 1.0) based on min/max
            float normalizedSpeed = Mathf.InverseLerp(minSpeed, maxSpeed, speed);
            
            // Set the "Speed" parameter in your Animator Controller
            animator.SetFloat(SpeedHash, normalizedSpeed);
        }
    }
}