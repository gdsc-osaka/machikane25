using Art.Fish;
using Art.Visitors;
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Art.Presentation.Schools
{
    /// <summary>
    /// Central coordination point for fish agents participating in the boids simulation.
    /// </summary>
    public sealed class SchoolCoordinator : MonoBehaviour
    {
        [SerializeField] private BoidSettings settings;
        [SerializeField] private VisitorInfluenceSettings visitorInfluence;
        [SerializeField] [Tooltip("Fish agents placed in the hierarchy to be automatically registered on startup.")]
        private FishAgent[] defaultFishAgents = Array.Empty<FishAgent>();
        [SerializeField] [Tooltip("Random noise range added to target positions.")]
        private float noiseRange = 2.0f;

        private readonly HashSet<FishAgent> agents = new HashSet<FishAgent>();
        private readonly List<FishAgent> pruneScratch = new List<FishAgent>();
        private IReadOnlyList<VisitorGroup> currentVisitors = Array.Empty<VisitorGroup>();
        private readonly Dictionary<FishAgent, Vector3> agentVelocities = new Dictionary<FishAgent, Vector3>();

        public IReadOnlyCollection<FishAgent> ActiveAgents => agents;

        public BoidSettings Settings => settings;

        public VisitorInfluenceSettings VisitorInfluence => visitorInfluence;

        public void SetSettings(BoidSettings newSettings)
        {
            settings = newSettings;
            foreach (var agent in agents)
            {
                agent.Configure(settings);
            }
        }

        public void SetVisitorInfluence(VisitorInfluenceSettings settingsAsset)
        {
            visitorInfluence = settingsAsset;
        }

        public void RegisterAgent(FishAgent agent)
        {
            if (agent == null)
            {
                return;
            }

            if (agents.Add(agent))
            {
                agent.Configure(settings);
            }
        }

        public void RemoveAgent(FishAgent agent)
        {
            if (agent == null)
            {
                return;
            }

            agents.Remove(agent);
            agentVelocities.Remove(agent);
        }

        public void ApplyVisitorInfluence(IReadOnlyList<VisitorGroup> visitors)
        {
            string log = "SchoolCoordinator received visitor groups:";
            if (visitors != null)
            {
                for (int i = 0; i < visitors.Count; i++)
                {
                    var v = visitors[i];
                    log += $" [Pos: {v.Position}, Mag: {v.Magnitude}]";
                }
            }
            Debug.Log(log);
            currentVisitors = visitors ?? Array.Empty<VisitorGroup>();
        }

        private void Awake()
        {
            RegisterDefaultFishAgents();
        }

        private void Update()
        {
            UpdateAgents();
        }

        private void RegisterDefaultFishAgents()
        {
            if (defaultFishAgents == null || defaultFishAgents.Length == 0)
            {
                return;
            }

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
            if (agents.Count == 0)
            {
                return;
            }

            pruneScratch.Clear();

            if (currentVisitors != null && currentVisitors.Count > 0)
            {
                Debug.Log($"Updating {agents.Count} fish agents with {currentVisitors.Count} visitors using boid algorithm");
            }

            foreach (var agent in agents)
            {
                if (agent == null)
                {
                    pruneScratch.Add(agent);
                    continue;
                }

                var fishController = agent.GetComponent<FishController>();
                if (fishController == null)
                {
                    Debug.LogWarning($"FishAgent {agent.name} doesn't have a FishController component");
                    continue;
                }

                // Calculate boid forces
                Vector3 separation = CalculateSeparation(agent);
                Vector3 alignment = CalculateAlignment(agent);
                Vector3 cohesion = CalculateCohesion(agent);
                Vector3 visitorAttraction = CalculateVisitorAttraction(agent);

                // Combine forces with weights
                Vector3 combinedForce = Vector3.zero;
                if (settings != null)
                {
                    combinedForce += separation * settings.SeparationWeight;
                    combinedForce += alignment * settings.AlignmentWeight;
                    combinedForce += cohesion * settings.CohesionWeight;
                    combinedForce += visitorAttraction * settings.VisitorAttractionWeight;
                }
                else
                {
                    combinedForce = visitorAttraction;
                }

                // Update velocity
                if (!agentVelocities.ContainsKey(agent))
                {
                    agentVelocities[agent] = agent.transform.forward * settings.MinSpeed;
                }

                Vector3 velocity = agentVelocities[agent];
                velocity += combinedForce * Time.deltaTime;

                // Clamp speed
                float speed = velocity.magnitude;
                if (speed > settings.MaxSpeed)
                {
                    velocity = velocity.normalized * settings.MaxSpeed;
                }
                else if (speed < settings.MinSpeed)
                {
                    velocity = velocity.normalized * settings.MinSpeed;
                }

                agentVelocities[agent] = velocity;

                // Set target position based on velocity
                Vector3 targetPosition = agent.transform.position + velocity;
                fishController.targetPosition = targetPosition;

                Debug.Log($"Fish {agent.name} boid forces - Sep:{separation.magnitude:F2} Align:{alignment.magnitude:F2} Coh:{cohesion.magnitude:F2} Visitor:{visitorAttraction.magnitude:F2}");
            }

            // Remove null agents
            if (pruneScratch.Count > 0)
            {
                foreach (var stale in pruneScratch)
                {
                    agents.Remove(stale);
                    agentVelocities.Remove(stale);
                }
                pruneScratch.Clear();
            }
        }

        private Vector3 CalculateSeparation(FishAgent agent)
        {
            Vector3 steer = Vector3.zero;
            int count = 0;

            foreach (var other in agents)
            {
                if (other == null || other == agent)
                {
                    continue;
                }

                float distance = Vector3.Distance(agent.transform.position, other.transform.position);
                if (distance > 0f && distance < settings.AvoidanceRadius)
                {
                    // Calculate vector pointing away from neighbor
                    Vector3 diff = agent.transform.position - other.transform.position;
                    diff.Normalize();
                    diff /= distance; // Weight by distance (closer = stronger)
                    steer += diff;
                    count++;
                }
            }

            if (count > 0)
            {
                steer /= count;
            }

            return steer;
        }

        private Vector3 CalculateAlignment(FishAgent agent)
        {
            Vector3 averageVelocity = Vector3.zero;
            int count = 0;

            foreach (var other in agents)
            {
                if (other == null || other == agent)
                {
                    continue;
                }

                float distance = Vector3.Distance(agent.transform.position, other.transform.position);
                if (distance > 0f && distance < settings.NeighbourRadius)
                {
                    if (agentVelocities.ContainsKey(other))
                    {
                        averageVelocity += agentVelocities[other];
                        count++;
                    }
                }
            }

            if (count > 0)
            {
                averageVelocity /= count;
                Vector3 steer = averageVelocity - (agentVelocities.ContainsKey(agent) ? agentVelocities[agent] : Vector3.zero);
                return steer.normalized;
            }

            return Vector3.zero;
        }

        private Vector3 CalculateCohesion(FishAgent agent)
        {
            Vector3 centerOfMass = Vector3.zero;
            int count = 0;

            foreach (var other in agents)
            {
                if (other == null || other == agent)
                {
                    continue;
                }

                float distance = Vector3.Distance(agent.transform.position, other.transform.position);
                if (distance > 0f && distance < settings.NeighbourRadius)
                {
                    centerOfMass += other.transform.position;
                    count++;
                }
            }

            if (count > 0)
            {
                centerOfMass /= count;
                Vector3 steer = centerOfMass - agent.transform.position;
                return steer.normalized;
            }

            return Vector3.zero;
        }

        private Vector3 CalculateVisitorAttraction(FishAgent agent)
        {
            if (currentVisitors == null || currentVisitors.Count == 0 || visitorInfluence == null)
            {
                return Vector3.zero;
            }

            Vector3 totalAttraction = Vector3.zero;

            foreach (var visitor in currentVisitors)
            {
                // Transform visitor position to world space
                Vector3 visitorWorldPos = visitorInfluence.ToWorldPosition(visitor.Position);

                // Calculate distance and direction
                Vector3 toVisitor = visitorWorldPos - agent.transform.position;
                float distance = toVisitor.magnitude;

                if (distance < visitorInfluence.MaxDistance && distance > 0.01f)
                {
                    // Apply falloff based on distance
                    float falloff = 1f - Mathf.Pow(distance / visitorInfluence.MaxDistance, visitorInfluence.FalloffPower);
                    falloff = Mathf.Max(0f, falloff);

                    // Weight by visitor magnitude
                    float strength = visitorInfluence.AttractionStrength * visitor.Magnitude * falloff;

                    totalAttraction += toVisitor.normalized * strength;
                }
            }

            // Add some noise for natural variation
            totalAttraction += new Vector3(
                UnityEngine.Random.Range(-noiseRange, noiseRange),
                UnityEngine.Random.Range(-noiseRange, noiseRange),
                UnityEngine.Random.Range(-noiseRange, noiseRange)
            ) * 0.1f;

            return totalAttraction;
        }

    }
}
