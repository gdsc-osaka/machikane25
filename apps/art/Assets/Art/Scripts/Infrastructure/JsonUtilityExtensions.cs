using System;
using UnityEngine;

namespace Art.Infrastructure
{
    public static class JsonUtilityExtensions
    {
        [Serializable]
        private sealed class ArrayWrapper<TItem>
        {
            public TItem[] items;
        }

        public static TItem[] FromJsonArray<TItem>(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return Array.Empty<TItem>();
            }

            var wrapped = WrapArray(json);
            var container = JsonUtility.FromJson<ArrayWrapper<TItem>>(wrapped);
            return container?.items ?? Array.Empty<TItem>();
        }

        private static string WrapArray(string json)
        {
            return $"{{\"items\":{json}}}";
        }
    }
}