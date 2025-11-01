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

        private readonly HashSet<FishAgent> agents = new HashSet<FishAgent>();
        private readonly Dictionary<FishAgent, Vector3> visitorSteering = new Dictionary<FishAgent, Vector3>();
        private readonly List<FishAgent> pruneScratch = new List<FishAgent>();
        private readonly List<VisitorSample> visitorSamples = new List<VisitorSample>();
        private IReadOnlyList<VisitorGroup> currentVisitors = Array.Empty<VisitorGroup>();

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
            RebuildVisitorSamples();
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
                visitorSteering[agent] = Vector3.zero;
            }
        }

        public void RemoveAgent(FishAgent agent)
        {
            if (agent == null)
            {
                return;
            }

            if (agents.Remove(agent))
            {
                visitorSteering.Remove(agent);
            }
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
            RebuildVisitorSamples();
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

            var deltaTime = Time.deltaTime;
            pruneScratch.Clear();
            // Debug.Log($"Updating {agents.Count} fish agents with visitor influence. Visitor samples count: {visitorSamples.Count}");
            foreach (var agent in agents)
            {
                // Debug.Log("Update agent: " + (agent != null ? agent.name : "null"));
                if (agent == null)
                {
                    pruneScratch.Add(agent);
                    continue;
                }

                var currentForce = visitorSteering.TryGetValue(agent, out var stored) ? stored : Vector3.zero;
                var targetForce = visitorSamples.Count == 0 ? Vector3.zero : CalculateSteering(agent.transform.position);
                var blendedForce = SmoothSteering(currentForce, targetForce, deltaTime);
                visitorSteering[agent] = blendedForce;
                agent.ApplyVisitorSteering(blendedForce);
                // Debug.Log($"Agent {agent.name}: targetForce={targetForce.magnitude:F3}, blendedForce={blendedForce.magnitude:F3}");
            }

            if (pruneScratch.Count > 0)
            {
                for (var i = 0; i < pruneScratch.Count; i++)
                {
                    var stale = pruneScratch[i];
                    agents.Remove(stale);
                    visitorSteering.Remove(stale);
                }

                pruneScratch.Clear();
            }
        }

        private Vector3 CalculateSteering(Vector3 agentPosition)
        {
            if (visitorInfluence == null || visitorSamples.Count == 0)
            {
                return Vector3.zero;
            }

            var planeHeight = visitorInfluence.PlaneHeight;
            var agentOnPlane = new Vector3(agentPosition.x, planeHeight, agentPosition.z);
            var maxDistance = Mathf.Max(0.1f, visitorInfluence.MaxDistance);
            var attraction = visitorInfluence.AttractionStrength;
            var falloffPower = visitorInfluence.FalloffPower;

            var accumulated = Vector3.zero;
            var totalWeight = 0f;

            for (var i = 0; i < visitorSamples.Count; i++)
            {
                var visitor = visitorSamples[i];
                var direction = visitor.Position - agentOnPlane;
                var distance = direction.magnitude;
                if (distance < 0.001f)
                {
                    continue;
                }

                var falloff = Mathf.Pow(Mathf.Clamp01(1f - distance / maxDistance), falloffPower);
                if (falloff <= 0f)
                {
                    continue;
                }

                var weight = visitor.Magnitude * falloff;
                accumulated += direction.normalized * weight;
                totalWeight += weight;
                // Debug.Log($"Visitor {i}: distance={distance:F2}, falloff={falloff:F3}, visitorMag={visitor.Magnitude:F3}, weight={weight:F3}");
            }

            if (totalWeight <= 0f)
            {
                return Vector3.zero;
            }

            var finalForce = accumulated.normalized * (attraction * totalWeight);
            // Debug.Log($"CalculateSteering: totalWeight={totalWeight:F3}, attraction={attraction}, accumulatedMag={accumulated.magnitude:F3}, finalForceMag={finalForce.magnitude:F3}");
            return finalForce;
        }

        private Vector3 SmoothSteering(Vector3 current, Vector3 target, float deltaTime)
        {
            if (visitorInfluence == null)
            {
                return Vector3.Lerp(current, target, 0.5f);
            }

            var rate = target == Vector3.zero ? visitorInfluence.AbsenceDamping : visitorInfluence.SteeringResponsiveness;
            var factor = 1f - Mathf.Exp(-rate * Mathf.Max(0f, deltaTime));
            return Vector3.Lerp(current, target, factor);
        }

        private void RebuildVisitorSamples()
        {
            visitorSamples.Clear();

            if (currentVisitors == null || currentVisitors.Count == 0 || visitorInfluence == null)
            {
                return;
            }

            for (var i = 0; i < currentVisitors.Count; i++)
            {
                var visitor = currentVisitors[i];
                if (visitor.Magnitude < visitorInfluence.MinimumMagnitude)
                {
                    continue;
                }

                var world = visitorInfluence.ToWorldPosition(visitor.Position);
                visitorSamples.Add(new VisitorSample(world, visitor.Magnitude));
            }
        }

        private readonly struct VisitorSample
        {
            public VisitorSample(Vector3 position, float magnitude)
            {
                Position = position;
                Magnitude = magnitude;
            }

            public Vector3 Position { get; }

            public float Magnitude { get; }
        }
    }
}
