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

            // If there are visitors, update fish target positions
            if (currentVisitors != null && currentVisitors.Count > 0)
            {
                Debug.Log($"Updating {agents.Count} fish agents with {currentVisitors.Count} visitors");

                foreach (var agent in agents)
                {
                    if (agent == null)
                    {
                        pruneScratch.Add(agent);
                        continue;
                    }

                    // Get FishController component
                    var fishController = agent.GetComponent<FishController>();
                    if (fishController == null)
                    {
                        Debug.LogWarning($"FishAgent {agent.name} doesn't have a FishController component");
                        continue;
                    }

                    // Use the first visitor's position (simplified logic)
                    var visitor = currentVisitors[0];

                    // Transform visitor position: (position - pivot) * placeExtent
                    Vector3 targetPosition = visitorInfluence.ToWorldPosition(visitor.Position);

                    // Add noise for natural movement
                    targetPosition += new Vector3(
                        UnityEngine.Random.Range(-noiseRange, noiseRange),
                        UnityEngine.Random.Range(-noiseRange, noiseRange),
                        UnityEngine.Random.Range(-noiseRange, noiseRange)
                    );

                    // Directly set the target position
                    fishController.targetPosition = targetPosition;

                    Debug.Log($"Fish {agent.name} target set to {targetPosition} (visitor at {visitor.Position})");
                }
            }

            // Remove null agents
            if (pruneScratch.Count > 0)
            {
                foreach (var stale in pruneScratch)
                {
                    agents.Remove(stale);
                }
                pruneScratch.Clear();
            }
        }

    }
}
