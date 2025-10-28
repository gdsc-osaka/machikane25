using System.Collections.Generic;
using UnityEngine;

namespace Art.Fish
{
    [System.Serializable]
    public sealed class FishTextureCache
    {
        private readonly Dictionary<string, Texture2D> textures = new Dictionary<string, Texture2D>();
        private bool initialized;

        public void Initialize()
        {
            textures.Clear();
            initialized = true;
        }

        public bool TryGet(string key, out Texture2D texture)
        {
            texture = null;

            if (!initialized || string.IsNullOrEmpty(key))
            {
                return false;
            }

            return textures.TryGetValue(key, out texture);
        }

        public void Store(string key, Texture2D texture)
        {
            if (!initialized || string.IsNullOrEmpty(key) || texture == null)
            {
                return;
            }

            textures[key] = texture;
        }

        public void Clear()
        {
            if (!initialized)
            {
                return;
            }

            foreach (var texture in textures.Values)
            {
                if (texture != null)
                {
                    Object.Destroy(texture);
                }
            }

            textures.Clear();
        }
    }
}