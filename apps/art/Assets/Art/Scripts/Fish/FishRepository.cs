using System;
using System.Collections.Generic;
using UnityEngine;

namespace Art.Fish
{
    [Serializable]
    public sealed class FishRepository
    {
        [Serializable]
        public sealed class FishData
        {
            public string id;
            public string textureUrl;
            public DateTime fetchedAtUtc;
        }

        private sealed class FishRecord
        {
            public FishData Data;
            public DateTime ExpiryUtc;
        }

        private readonly Dictionary<string, FishRecord> records = new Dictionary<string, FishRecord>();
        private float ttlSeconds;
        private bool initialized;

        public event Action<FishData> FishAdded;
        public event Action<FishData> FishUpdated;
        public event Action<string> FishRemoved;

        public void Initialize(float ttl)
        {
            ttlSeconds = Mathf.Max(0f, ttl);
            records.Clear();
            initialized = true;
        }

        public IReadOnlyCollection<FishData> GetAll()
        {
            var all = new List<FishData>(records.Count);
            foreach (var record in records.Values)
            {
                all.Add(record.Data);
            }

            return all;
        }

        public void Upsert(FishData fish)
        {
            if (!initialized || fish == null || string.IsNullOrEmpty(fish.id))
            {
                return;
            }

            fish.fetchedAtUtc = DateTime.UtcNow;
            var expiry = ttlSeconds > 0f ? fish.fetchedAtUtc.AddSeconds(ttlSeconds) : DateTime.MaxValue;

            if (records.TryGetValue(fish.id, out var existing))
            {
                existing.Data = fish;
                existing.ExpiryUtc = expiry;
                FishUpdated?.Invoke(fish);
            }
            else
            {
                records[fish.id] = new FishRecord
                {
                    Data = fish,
                    ExpiryUtc = expiry
                };
                FishAdded?.Invoke(fish);
            }
        }

        public void Remove(string fishId)
        {
            if (!initialized || string.IsNullOrEmpty(fishId))
            {
                return;
            }

            if (records.Remove(fishId))
            {
                FishRemoved?.Invoke(fishId);
            }
        }

        public void PruneExpired()
        {
            if (!initialized)
            {
                return;
            }

            if (ttlSeconds <= 0f)
            {
                return;
            }

            var now = DateTime.UtcNow;
            var removals = new List<string>();

            foreach (var kvp in records)
            {
                if (kvp.Value.ExpiryUtc <= now)
                {
                    removals.Add(kvp.Key);
                }
            }

            foreach (var fishId in removals)
            {
                records.Remove(fishId);
                FishRemoved?.Invoke(fishId);
            }
        }
    }
}
