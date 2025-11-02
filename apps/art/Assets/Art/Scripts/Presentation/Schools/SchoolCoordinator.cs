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

        // Current target x position controlled by keyboard (default to middle)
        private float targetXPosition = 0.5f;

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
            HandleKeyboardInput();
            UpdateAgents();
        }

        private void HandleKeyboardInput()
        {
            // Map number keys to x coordinates
            if (Input.GetKeyDown(KeyCode.Alpha1)) targetXPosition = 0.05f;
            else if (Input.GetKeyDown(KeyCode.Alpha2)) targetXPosition = 0.15f;
            else if (Input.GetKeyDown(KeyCode.Alpha3)) targetXPosition = 0.25f;
            else if (Input.GetKeyDown(KeyCode.Alpha4)) targetXPosition = 0.35f;
            else if (Input.GetKeyDown(KeyCode.Alpha5)) targetXPosition = 0.45f;
            else if (Input.GetKeyDown(KeyCode.Alpha6)) targetXPosition = 0.55f;
            else if (Input.GetKeyDown(KeyCode.Alpha7)) targetXPosition = 0.65f;
            else if (Input.GetKeyDown(KeyCode.Alpha8)) targetXPosition = 0.75f;
            else if (Input.GetKeyDown(KeyCode.Alpha9)) targetXPosition = 0.85f;
            else if (Input.GetKeyDown(KeyCode.Alpha0)) targetXPosition = 0.95f;
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

            // Update fish target positions based on keyboard input
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

                // Create a normalized position vector with the keyboard-controlled x coordinate
                // Using (x, 0.5, 0.5) as a default - y and z are centered
                Vector2 normalizedPosition = new Vector2(targetXPosition, 0.5f);

                // Transform to world position using the same system as before
                Vector3 targetPosition = visitorInfluence.ToWorldPosition(normalizedPosition);

                // Add noise for natural movement
                targetPosition += new Vector3(
                    UnityEngine.Random.Range(-noiseRange, noiseRange),
                    UnityEngine.Random.Range(-noiseRange, noiseRange),
                    UnityEngine.Random.Range(-noiseRange, noiseRange)
                );

                // Directly set the target position
                fishController.targetPosition = targetPosition;

                Debug.Log($"Fish {agent.name} target set to {targetPosition} (keyboard x: {targetXPosition})");
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
