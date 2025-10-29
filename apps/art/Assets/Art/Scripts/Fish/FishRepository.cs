using System;
using System.Collections.Generic;
using UnityEngine;

namespace Art.Fish
{
    /// <summary>
    /// Maintains the set of known fish and notifies listeners when the collection changes.
    /// </summary>
    [Serializable]
    public sealed class FishRepository
    {
        private sealed class FishRecord
        {
            public FishState State;
            public float LastSeenTime;
        }

        private readonly Dictionary<string, FishRecord> fishById = new Dictionary<string, FishRecord>(StringComparer.Ordinal);
        private float ttlSeconds;
        private float lastPurgeTime;
        private bool initialized;
        private Func<float> timeProvider = () => Time.time;

        public event Action<FishState> FishAdded;
        public event Action<FishState> FishUpdated;
        public event Action<string> FishRemoved;

        public void Initialize(float ttlSecondsConfig)
        {
            ttlSeconds = Mathf.Max(0f, ttlSecondsConfig);
            fishById.Clear();
            lastPurgeTime = GetNow();
            initialized = true;
        }

        public void SetTimeProvider(Func<float> provider)
        {
            timeProvider = provider ?? (() => Time.time);
        }

        public IReadOnlyList<FishState> Snapshot()
        {
            EnsureInitialized();
            var snapshot = new List<FishState>(fishById.Count);
            foreach (var record in fishById.Values)
            {
                snapshot.Add(record.State);
            }

            return snapshot;
        }

        public FishDiffResult ApplyPayload(IReadOnlyList<FishState> nextStates)
        {
            EnsureInitialized();

            var now = GetNow();
            var added = new List<FishState>();
            var updated = new List<FishState>();
            var removed = new List<string>();
            var seenIds = new HashSet<string>(StringComparer.Ordinal);

            if (nextStates != null)
            {
                for (var i = 0; i < nextStates.Count; i++)
                {
                    var state = nextStates[i];
                    if (state == null || string.IsNullOrEmpty(state.Id))
                    {
                        continue;
                    }

                    var id = state.Id;
                    if (!seenIds.Add(id))
                    {
                        continue;
                    }

                    if (fishById.TryGetValue(id, out var record))
                    {
                        if (HasMeaningfulChanges(record.State, state))
                        {
                            record.State = state;
                            updated.Add(state);
                            FishUpdated?.Invoke(state);
                        }
                        else
                        {
                            record.State = state;
                        }

                        record.LastSeenTime = now;
                    }
                    else
                    {
                        fishById[id] = new FishRecord
                        {
                            State = state,
                            LastSeenTime = now
                        };
                        added.Add(state);
                        FishAdded?.Invoke(state);
                    }
                }
            }

            CollectMissingRecords(seenIds, removed);
            var ttlRemoved = PurgeExpiredInternal(now);
            if (ttlRemoved.Count > 0)
            {
                removed.AddRange(ttlRemoved);
            }

            if (added.Count == 0 && updated.Count == 0 && removed.Count == 0)
            {
                return FishDiffResult.Empty;
            }

            return new FishDiffResult(added, updated, removed);
        }

        public void PurgeExpired(float currentTimeSeconds)
        {
            EnsureInitialized();
            PurgeExpiredInternal(Mathf.Max(0f, currentTimeSeconds));
        }

        private void CollectMissingRecords(HashSet<string> seenIds, List<string> removed)
        {
            if (fishById.Count == 0 || seenIds.Count >= fishById.Count)
            {
                return;
            }

            var idsToRemove = new List<string>();
            foreach (var kvp in fishById)
            {
                if (!seenIds.Contains(kvp.Key))
                {
                    idsToRemove.Add(kvp.Key);
                }
            }

            for (var i = 0; i < idsToRemove.Count; i++)
            {
                var id = idsToRemove[i];
                fishById.Remove(id);
                removed.Add(id);
                FishRemoved?.Invoke(id);
            }
        }

        private List<string> PurgeExpiredInternal(float now)
        {
            var removed = new List<string>();

            if (ttlSeconds <= 0f)
            {
                lastPurgeTime = now;
                return removed;
            }

            if (now - lastPurgeTime < 0.01f)
            {
                return removed;
            }

            foreach (var kvp in fishById)
            {
                if (now - kvp.Value.LastSeenTime >= ttlSeconds)
                {
                    removed.Add(kvp.Key);
                }
            }

            for (var i = 0; i < removed.Count; i++)
            {
                var id = removed[i];
                fishById.Remove(id);
                FishRemoved?.Invoke(id);
            }

            lastPurgeTime = now;
            return removed;
        }

        private static bool HasMeaningfulChanges(FishState previous, FishState current)
        {
            if (previous == null)
            {
                return true;
            }

            if (!string.Equals(previous.ImageUrl, current.ImageUrl, StringComparison.Ordinal))
            {
                return true;
            }

            if (!ColorsEqual(previous.Tint, current.Tint))
            {
                return true;
            }

            return false;
        }

        private static bool ColorsEqual(Color a, Color b)
        {
            const float tolerance = 0.001f;
            return Mathf.Abs(a.r - b.r) <= tolerance &&
                   Mathf.Abs(a.g - b.g) <= tolerance &&
                   Mathf.Abs(a.b - b.b) <= tolerance &&
                   Mathf.Abs(a.a - b.a) <= tolerance;
        }

        private float GetNow()
        {
            try
            {
                return timeProvider?.Invoke() ?? Time.time;
            }
            catch
            {
                return Time.time;
            }
        }

        private void EnsureInitialized()
        {
            if (!initialized)
            {
                throw new InvalidOperationException("FishRepository must be initialized before use.");
            }
        }
    }
}