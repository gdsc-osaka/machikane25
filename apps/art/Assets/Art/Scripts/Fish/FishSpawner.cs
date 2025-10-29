using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using Art.Presentation.Schools;
using Art.Telemetry;
using UnityEngine;

namespace Art.Fish
{
    /// <summary>
    /// Listens to repository events, instantiates fish prefabs, and keeps their textures in sync.
    /// </summary>
    public sealed class FishSpawner : MonoBehaviour
    {
        [Header("Presentation")]
        [SerializeField] private SchoolCoordinator schoolCoordinator;
        [SerializeField] private FishDefinition defaultDefinition;
        [SerializeField] private List<FishDefinition> variantDefinitions = new List<FishDefinition>();
        [SerializeField] private Transform fishParent;

        private readonly Dictionary<string, FishInstance> activeAgents = new Dictionary<string, FishInstance>(StringComparer.Ordinal);

        private FishRepository repository;
        private FishTextureCache textureCache;
        private TelemetryLogger telemetry;
        private bool initialized;

        public void Initialize(FishRepository repo, FishTextureCache cache, TelemetryLogger telemetryLogger)
        {
            TeardownSubscriptions();
            ClearActiveAgents();

            repository = repo;
            textureCache = cache;
            telemetry = telemetryLogger;

            if (repository == null || textureCache == null)
            {
                telemetry?.LogWarning("FishSpawner missing repository or texture cache; cannot initialize.");
                initialized = false;
                return;
            }

            if (fishParent == null)
            {
                fishParent = transform;
            }

            repository.FishAdded += HandleFishAdded;
            repository.FishUpdated += HandleFishUpdated;
            repository.FishRemoved += HandleFishRemoved;

            initialized = true;

            try
            {
                var snapshot = repository.Snapshot();
                if (snapshot != null)
                {
                    for (var i = 0; i < snapshot.Count; i++)
                    {
                        var fish = snapshot[i];
                        if (fish != null)
                        {
                            SpawnOrUpdate(fish, isInitialSync: true);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                telemetry?.LogException("FishSpawner failed to synchronise initial snapshot.", ex);
            }
        }

        private void OnDestroy()
        {
            TeardownSubscriptions();
            ClearActiveAgents();
        }

        private void HandleFishAdded(FishState fish)
        {
            if (!initialized || fish == null)
            {
                return;
            }

            SpawnOrUpdate(fish, isInitialSync: false);
            telemetry?.LogInfo($"fish_spawn id={fish.Id}");
        }

        private void HandleFishUpdated(FishState fish)
        {
            if (!initialized || fish == null)
            {
                return;
            }

            if (!activeAgents.TryGetValue(fish.Id, out var instance))
            {
                SpawnOrUpdate(fish, isInitialSync: false);
                return;
            }

            instance.State = fish;

            if (!string.Equals(instance.ImageUrl, fish.ImageUrl, StringComparison.Ordinal))
            {
                BeginTextureLoad(fish.Id, instance, fish);
            }
            else
            {
                var texture = instance.Agent != null ? instance.Agent.GetAppliedTexture() : null;
                instance.Agent?.ApplyState(fish, texture);
            }

            telemetry?.LogInfo($"fish_update id={fish.Id}");
        }

        private void HandleFishRemoved(string fishId)
        {
            if (!initialized || string.IsNullOrEmpty(fishId))
            {
                return;
            }

            if (!activeAgents.TryGetValue(fishId, out var instance))
            {
                return;
            }

            DisposeInstance(instance);
            activeAgents.Remove(fishId);
            telemetry?.LogInfo($"fish_despawn id={fishId}");
        }

        private void SpawnOrUpdate(FishState fish, bool isInitialSync)
        {
            if (fish == null || string.IsNullOrEmpty(fish.Id))
            {
                return;
            }

            if (activeAgents.TryGetValue(fish.Id, out var existing))
            {
                existing.State = fish;
                BeginTextureLoad(fish.Id, existing, fish);
                return;
            }

            var definition = ResolveDefinition(fish) ?? defaultDefinition;
            if (definition?.Prefab == null)
            {
                telemetry?.LogWarning($"FishSpawner has no prefab definition for fish {fish.Id}.");
                return;
            }

            var agent = Instantiate(definition.Prefab, fishParent);
            agent.name = $"Fish_{fish.Id}";
            agent.transform.localPosition = Vector3.zero;
            agent.transform.localRotation = Quaternion.identity;
            agent.ApplyDefinition(definition);
            agent.SetSwimming(true);

            var instance = new FishInstance
            {
                Agent = agent,
                State = fish
            };

            activeAgents[fish.Id] = instance;

            if (schoolCoordinator != null)
            {
                schoolCoordinator.RegisterAgent(agent);
            }
            else
            {
                agent.Configure(null);
            }

            BeginTextureLoad(fish.Id, instance, fish, applyImmediately: isInitialSync);
        }

        private FishDefinition ResolveDefinition(FishState fish)
        {
            if (variantDefinitions == null || variantDefinitions.Count == 0 || fish == null)
            {
                return defaultDefinition;
            }

            for (var i = 0; i < variantDefinitions.Count; i++)
            {
                var candidate = variantDefinitions[i];
                if (candidate == null)
                {
                    continue;
                }

                if (string.Equals(candidate.name, fish.Id, StringComparison.OrdinalIgnoreCase))
                {
                    return candidate;
                }
            }

            return defaultDefinition;
        }

        private void BeginTextureLoad(string fishId, FishInstance instance, FishState state, bool applyImmediately = false)
        {
            if (instance == null || instance.Agent == null)
            {
                return;
            }

            instance.State = state;
            instance.ImageUrl = state?.ImageUrl ?? string.Empty;

            if (instance.TextureRoutine != null)
            {
                StopCoroutine(instance.TextureRoutine);
                instance.TextureRoutine = null;
            }

            if (applyImmediately)
            {
                instance.Agent.ApplyState(state, instance.Agent.GetAppliedTexture());
            }

            if (textureCache == null || string.IsNullOrWhiteSpace(instance.ImageUrl))
            {
                instance.Agent.ApplyState(state, null);
                return;
            }

            instance.TextureRoutine = StartCoroutine(LoadAndApplyTextureCoroutine(fishId, instance.ImageUrl));
        }

        private IEnumerator LoadAndApplyTextureCoroutine(string fishId, string imageUrl)
        {
            Task<Texture2D> loadTask = null;

            try
            {
                loadTask = textureCache.LoadAsync(imageUrl, telemetry);
            }
            catch (Exception ex)
            {
                telemetry?.LogException($"FishSpawner failed to queue texture load for {imageUrl}.", ex);
                yield break;
            }

            if (loadTask == null)
            {
                yield break;
            }

            while (!loadTask.IsCompleted)
            {
                yield return null;
            }

            Texture2D texture = null;

            if (loadTask.IsFaulted)
            {
                telemetry?.LogException($"Fish texture load failed for {imageUrl}.", loadTask.Exception);
            }
            else if (!loadTask.IsCanceled)
            {
                texture = loadTask.Result;
            }

            if (!activeAgents.TryGetValue(fishId, out var instance))
            {
                yield break;
            }

            instance.TextureRoutine = null;

            if (!string.Equals(instance.ImageUrl, imageUrl, StringComparison.Ordinal))
            {
                yield break;
            }

            try
            {
                instance.Agent?.ApplyState(instance.State, texture);
            }
            catch (Exception ex)
            {
                telemetry?.LogException($"Failed to apply texture for fish {fishId}.", ex);
            }
        }

        private void TeardownSubscriptions()
        {
            if (repository != null)
            {
                repository.FishAdded -= HandleFishAdded;
                repository.FishUpdated -= HandleFishUpdated;
                repository.FishRemoved -= HandleFishRemoved;
            }

            initialized = false;
        }

        private void ClearActiveAgents()
        {
            foreach (var instance in activeAgents.Values)
            {
                DisposeInstance(instance);
            }

            activeAgents.Clear();
        }

        private void DisposeInstance(FishInstance instance)
        {
            if (instance == null)
            {
                return;
            }

            if (instance.TextureRoutine != null)
            {
                StopCoroutine(instance.TextureRoutine);
                instance.TextureRoutine = null;
            }

            if (instance.Agent != null)
            {
                if (schoolCoordinator != null)
                {
                    schoolCoordinator.RemoveAgent(instance.Agent);
                }

                DestroyAgent(instance.Agent.gameObject);
                instance.Agent = null;
            }
        }

        private static void DestroyAgent(GameObject agentObject)
        {
            if (agentObject == null)
            {
                return;
            }

            if (Application.isPlaying)
            {
                Destroy(agentObject);
            }
            else
            {
                DestroyImmediate(agentObject);
            }
        }

        private sealed class FishInstance
        {
            public FishAgent Agent;
            public FishState State;
            public string ImageUrl;
            public Coroutine TextureRoutine;
        }
    }
}
