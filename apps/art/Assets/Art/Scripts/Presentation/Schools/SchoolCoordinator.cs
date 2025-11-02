using Art.Fish;
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Art.Presentation.Schools
{
    public sealed class SchoolCoordinator : MonoBehaviour
    {
        [SerializeField] private BoidSettings settings;

        [SerializeField] [Tooltip("Fish agents placed in the hierarchy to be automatically registered on startup.")]
        private FishAgent[] defaultFishAgents = Array.Empty<FishAgent>();

        [Header("Bounds")] [SerializeField] [Tooltip("World position pivot point for coordinate transformation.")]
        private Vector3 pivot = Vector3.zero;

        [SerializeField] [Tooltip("Scale factor for coordinate transformation.")]
        private Vector3 placeExtent = new Vector3(10f, 5f, 10f);

        [Header("Boid Parameters")] [SerializeField] [Tooltip("Weight for separation force.")]
        private float separationWeight = 1.5f;

        [SerializeField] [Tooltip("Weight for alignment force.")]
        private float alignmentWeight = 1.0f;

        [SerializeField] [Tooltip("Weight for cohesion force.")]
        private float cohesionWeight = 1.0f;

        [SerializeField] [Tooltip("Weight for target seeking force.")]
        private float targetWeight = 2.0f;

        [SerializeField] [Tooltip("Weight for bounds avoidance force.")]
        private float boundsWeight = 3.0f;

        [SerializeField] [Tooltip("Weight for external visitor steering force.")]
        private float visitorSteeringWeight = 5.0f;

        [SerializeField] [Tooltip("Margin from bounds to start avoiding.")]
        private float boundsMargin = 2.0f;

        private readonly HashSet<FishAgent> agents = new HashSet<FishAgent>();
        private readonly List<FishAgent> pruneScratch = new List<FishAgent>();
        private readonly Dictionary<FishAgent, Vector3> velocities = new Dictionary<FishAgent, Vector3>();

        // Current target position controlled by keyboard
        private Vector3? targetPosition = null;
        private bool hasActiveTarget = false;

        private Vector3 boundsMin;
        private Vector3 boundsMax;

        public IReadOnlyCollection<FishAgent> ActiveAgents => agents;
        public BoidSettings Settings => settings;

        public void SetSettings(BoidSettings newSettings)
        {
            settings = newSettings;
            foreach (var agent in agents)
            {
                agent.Configure(settings);
            }
        }

        public void RegisterAgent(FishAgent agent)
        {
            if (agent == null) return;
            if (agents.Add(agent))
            {
                agent.Configure(settings);
                // Initialize with random velocity
                velocities[agent] = UnityEngine.Random.insideUnitSphere.normalized * settings.MinSpeed;
            }
        }

        public void RemoveAgent(FishAgent agent)
        {
            if (agent == null) return;
            agents.Remove(agent);
            velocities.Remove(agent);
        }

        private void Awake()
        {
            RegisterDefaultFishAgents();
            
            // Calculate world space bounds
            boundsMin = pivot - placeExtent * 0.5f;
            boundsMax = pivot + placeExtent * 0.5f;
        }

        private void Update()
        {
            HandleKeyboardInput();
            UpdateAgents();
        }

        private void HandleKeyboardInput()
        {
            var keyboard = Keyboard.current;
            if (keyboard == null) return;

            // Map number keys to x coordinates
            float? targetX = null;
            if (keyboard.digit1Key.wasPressedThisFrame) targetX = 0.05f;
            else if (keyboard.digit2Key.wasPressedThisFrame) targetX = 0.15f;
            else if (keyboard.digit3Key.wasPressedThisFrame) targetX = 0.25f;
            else if (keyboard.digit4Key.wasPressedThisFrame) targetX = 0.35f;
            else if (keyboard.digit5Key.wasPressedThisFrame) targetX = 0.45f;
            else if (keyboard.digit6Key.wasPressedThisFrame) targetX = 0.55f;
            else if (keyboard.digit7Key.wasPressedThisFrame) targetX = 0.65f;
            else if (keyboard.digit8Key.wasPressedThisFrame) targetX = 0.75f;
            else if (keyboard.digit9Key.wasPressedThisFrame) targetX = 0.85f;
            else if (keyboard.digit0Key.wasPressedThisFrame) targetX = 0.95f;

            if (targetX.HasValue)
            {
                // Transform to world position
                Vector3 target = new Vector3(
                    (targetX.Value - 0.5f) * placeExtent.x + pivot.x,
                    pivot.y, // Assuming pivot.y is the desired height
                    pivot.z  // Assuming pivot.z is the desired depth
                );
                targetPosition = target;
                hasActiveTarget = true;
                Debug.Log($"Target position set to {target} (x: {targetX.Value})");
            }
        }

        private void RegisterDefaultFishAgents()
        {
            if (defaultFishAgents == null || defaultFishAgents.Length == 0) return;
            foreach (var fishAgent in defaultFishAgents)
            {
                if (fishAgent != null)
                {
                    RegisterAgent(fishAgent);
                }
            }
            Debug.Log($"SchoolCoordinator registered {agents.Count} default fish agents from hierarchy.");
        }

        private void UpdateAgents()
        {
            if (settings == null)
            {
                Debug.LogWarning("BoidSettings not assigned. Skipping agent update.");
                return;
            }

            // Prune any null (destroyed) agents
            pruneScratch.Clear();
            foreach (var agent in agents)
            {
                if (agent == null)
                {
                    pruneScratch.Add(agent);
                }
            }
            foreach (var agentToRemove in pruneScratch)
            {
                RemoveAgent(agentToRemove);
            }

            // Main Boid calculation loop
            foreach (var agent in agents)
            {
                Vector3 currentVelocity = velocities[agent];

                // Calculate all steering forces
                Vector3 separation = CalculateSeparation(agent);
                Vector3 alignment = CalculateAlignment(agent);
                Vector3 cohesion = CalculateCohesion(agent);
                Vector3 target = CalculateTarget(agent);
                Vector3 bounds = CalculateBounds(agent);
                
                // Get and consume visitor steering force
                Vector3 visitor = agent.ConsumeVisitorSteering();

                // Apply weighted forces to acceleration
                Vector3 acceleration = Vector3.zero;
                acceleration += separation * separationWeight;
                acceleration += alignment * alignmentWeight;
                acceleration += cohesion * cohesionWeight;
                acceleration += target * targetWeight;
                acceleration += bounds * boundsWeight;
                acceleration += visitor * visitorSteeringWeight; // Apply visitor force

                // Update velocity with acceleration
                Vector3 newVelocity = currentVelocity + acceleration * Time.deltaTime;

                // Clamp speed to min/max
                float speed = newVelocity.magnitude;
                if (speed > settings.MaxSpeed)
                {
                    newVelocity = newVelocity.normalized * settings.MaxSpeed;
                }
                else if (speed < settings.MinSpeed)
                {
                    newVelocity = newVelocity.normalized * settings.MinSpeed;
                }

                // Store new velocity and update position
                velocities[agent] = newVelocity;
                agent.transform.position += newVelocity * Time.deltaTime;

                // Update rotation
                if (newVelocity.sqrMagnitude > 0.01f) // Avoid zero vector
                {
                    agent.transform.rotation = Quaternion.LookRotation(newVelocity);
                }
                
                // Update the fish's animator
                agent.UpdateVelocity(newVelocity); // Call the new method on FishAgent
            }
        }

        #region Boid Rule Implementations

        private Vector3 CalculateSeparation(FishAgent currentAgent)
        {
            Vector3 separationForce = Vector3.zero;
            int neighborCount = 0;
            foreach (var other in agents)
            {
                if (other == currentAgent) continue;

                Vector3 offset = currentAgent.transform.position - other.transform.position;
                float sqrDist = offset.sqrMagnitude;

                // Check if within separation (avoidance) radius
                if (sqrDist > 0 && sqrDist < settings.AvoidanceRadius * settings.AvoidanceRadius)
                {
                    // Force is stronger closer to the neighbor
                    separationForce += offset.normalized / Mathf.Sqrt(sqrDist);
                    neighborCount++;
                }
            }

            if (neighborCount > 0)
            {
                separationForce /= neighborCount;
            }

            return Steer(currentAgent, separationForce);
        }

        private Vector3 CalculateAlignment(FishAgent currentAgent)
        {
            Vector3 avgVelocity = Vector3.zero;
            int neighborCount = 0;
            foreach (var other in agents)
            {
                if (other == currentAgent) continue;

                float sqrDist = (currentAgent.transform.position - other.transform.position).sqrMagnitude;
                // Check if within perception radius
                if (sqrDist < settings.PerceptionRadius * settings.PerceptionRadius)
                {
                    avgVelocity += velocities[other];
                    neighborCount++;
                }
            }

            if (neighborCount > 0)
            {
                avgVelocity /= neighborCount;
                return Steer(currentAgent, avgVelocity);
            }
            return Vector3.zero;
        }

        private Vector3 CalculateCohesion(FishAgent currentAgent)
        {
            Vector3 centerOfMass = Vector3.zero;
            int neighborCount = 0;
            foreach (var other in agents)
            {
                if (other == currentAgent) continue;

                float sqrDist = (currentAgent.transform.position - other.transform.position).sqrMagnitude;
                // Check if within perception radius
                if (sqrDist < settings.PerceptionRadius * settings.PerceptionRadius)
                {
                    centerOfMass += other.transform.position;
                    neighborCount++;
                }
            }

            if (neighborCount > 0)
            {
                centerOfMass /= neighborCount;
                Vector3 directionToCenter = centerOfMass - currentAgent.transform.position;
                return Steer(currentAgent, directionToCenter);
            }
            return Vector3.zero;
        }

        private Vector3 CalculateTarget(FishAgent currentAgent)
        {
            if (!hasActiveTarget || !targetPosition.HasValue)
            {
                return Vector3.zero;
            }
            
            Vector3 directionToTarget = targetPosition.Value - currentAgent.transform.position;
            return Steer(currentAgent, directionToTarget);
        }

        private Vector3 CalculateBounds(FishAgent currentAgent)
        {
            Vector3 pos = currentAgent.transform.position;
            Vector3 desiredDirection = Vector3.zero;

            // Check each axis against the bounds
            if (pos.x < boundsMin.x + boundsMargin) desiredDirection.x = 1;
            else if (pos.x > boundsMax.x - boundsMargin) desiredDirection.x = -1;

            if (pos.y < boundsMin.y + boundsMargin) desiredDirection.y = 1;
            else if (pos.y > boundsMax.y - boundsMargin) desiredDirection.y = -1;

            if (pos.z < boundsMin.z + boundsMargin) desiredDirection.z = 1;
            else if (pos.z > boundsMax.z - boundsMargin) desiredDirection.z = -1;

            return Steer(currentAgent, desiredDirection);
        }

        /// <summary>
        /// Calculates the steering force required to move in a desired direction.
        /// </summary>
        private Vector3 Steer(FishAgent agent, Vector3 desiredDirection)
        {
            if (desiredDirection.sqrMagnitude == 0)
            {
                return Vector3.zero;
            }

            // Desired velocity is to move in the desired direction at max speed
            Vector3 desiredVelocity = desiredDirection.normalized * settings.MaxSpeed;
            
            // Steering force is the change needed to get from current to desired velocity
            Vector3 steeringForce = desiredVelocity - velocities[agent];
            
            // Clamp the force to the maximum steering ability
            steeringForce = Vector3.ClampMagnitude(steeringForce, settings.MaxSteerForce);
            
            return steeringForce;
        }

        #endregion
    }
}