using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Art.Fish
{
    [CreateAssetMenu(menuName = "Art/Fish/Mock Data Provider", fileName = "MockFishDataProvider")]
    public sealed class MockFishDataProvider : ScriptableObject, IFishDataProvider
    {
        [SerializeField] private MockFishDataset dataset;
        [SerializeField] private Vector2 latencyRangeMs = new Vector2(120f, 420f);
        [SerializeField] private bool randomiseTimestamps;

        public string SourceTag => "mock";

        public void SetDataset(MockFishDataset value)
        {
            dataset = value;
        }

        public IEnumerator Fetch(FishDataProviderContext context)
        {
            if (context == null)
            {
                yield break;
            }

            var start = Time.realtimeSinceStartup;
            var latencySeconds = Mathf.Max(0f, GetLatencySeconds());
            if (latencySeconds > 0f)
            {
                yield return new WaitForSeconds(latencySeconds);
            }

            if (dataset == null || dataset.entries == null || dataset.entries.Count == 0)
            {
                context.ReportFailure?.Invoke(new FishDataProviderFailure("mock_dataset_empty", (Time.realtimeSinceStartup - start) * 1000f));
                yield break;
            }

            var states = new List<FishState>(dataset.entries.Count);
            var now = DateTime.UtcNow;

            for (var i = 0; i < dataset.entries.Count; i++)
            {
                var entry = dataset.entries[i];
                if (string.IsNullOrWhiteSpace(entry.id))
                {
                    continue;
                }

                var createdAt = ParseCreatedAt(entry.createdAtIso, now, i);
                var imageUrl = string.IsNullOrEmpty(entry.imageUrl) ? $"mock://{entry.id}" : entry.imageUrl;
                var tint = entry.tint;
                states.Add(new FishState(entry.id, imageUrl, tint, createdAt));
            }

            context.ReportSuccess?.Invoke(new FishDataProviderSuccess(states, (Time.realtimeSinceStartup - start) * 1000f));
        }

        private float GetLatencySeconds()
        {
            if (latencyRangeMs.x <= 0f && latencyRangeMs.y <= 0f)
            {
                return 0f;
            }

            var min = Mathf.Max(0f, Mathf.Min(latencyRangeMs.x, latencyRangeMs.y));
            var max = Mathf.Max(min, Mathf.Max(latencyRangeMs.x, latencyRangeMs.y));
            return Random.Range(min, max) / 1000f;
        }

        private DateTime ParseCreatedAt(string isoString, DateTime fallback, int index)
        {
            if (!string.IsNullOrWhiteSpace(isoString))
            {
                if (DateTime.TryParse(isoString, null, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed))
                {
                    return parsed;
                }
            }

            if (randomiseTimestamps)
            {
                return fallback.AddSeconds(-index * 5f);
            }

            return fallback;
        }
    }
}
