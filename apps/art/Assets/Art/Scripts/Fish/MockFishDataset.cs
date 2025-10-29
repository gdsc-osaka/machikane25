using System;
using System.Collections.Generic;
using UnityEngine;

namespace Art.Fish
{
    [CreateAssetMenu(menuName = "Art/Fish/Mock Dataset", fileName = "MockFishDataset")]
    public sealed class MockFishDataset : ScriptableObject
    {
        public List<MockFishEntry> entries = new List<MockFishEntry>();
    }

    [Serializable]
    public struct MockFishEntry
    {
        public string id;
        [Tooltip("Optional image URL used by FishTextureCache. Leave empty to reuse last known URL or use placeholder textures.")]
        public string imageUrl;
        public Color tint;
        [Tooltip("ISO-8601 timestamp. If empty, current UTC time is used.")]
        public string createdAtIso;
    }
}
