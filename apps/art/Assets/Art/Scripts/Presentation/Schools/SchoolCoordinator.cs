using System.Collections.Generic;
using Art.Fish;
using UnityEngine;

namespace Art.Presentation.Schools
{
    /// <summary>
    /// Central coordination point for fish agents participating in the boids simulation.
    /// </summary>
    public sealed class SchoolCoordinator : MonoBehaviour
    {
        [SerializeField] private BoidSettings settings;

        private readonly HashSet<FishAgent> agents = new HashSet<FishAgent>();

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
    }
}
