using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Art.Telemetry;
using UnityEngine;
using UnityEngine.Networking;

namespace Art.Fish
{
    /// <summary>
    /// Provides disk-backed runtime caching of fish textures to minimise repeated downloads.
    /// </summary>
    [Serializable]
    public sealed class FishTextureCache
    {
        private readonly Dictionary<string, Texture2D> runtimeCache = new Dictionary<string, Texture2D>(StringComparer.Ordinal);
        private readonly Dictionary<string, Task<Texture2D>> inflightLoads = new Dictionary<string, Task<Texture2D>>(StringComparer.Ordinal);
        private readonly object syncRoot = new object();

        private string cacheRoot;

        public bool IsInitialized => !string.IsNullOrEmpty(cacheRoot);

        public void Initialize(string cacheRootPath)
        {
            if (string.IsNullOrWhiteSpace(cacheRootPath))
            {
                throw new ArgumentException("Cache root path must be provided.", nameof(cacheRootPath));
            }

            cacheRoot = cacheRootPath;
            Directory.CreateDirectory(cacheRoot);
            Clear();
        }

        public async Task<Texture2D> LoadAsync(string imageUrl, TelemetryLogger telemetry)
        {
            if (!IsInitialized || string.IsNullOrWhiteSpace(imageUrl))
            {
                return null;
            }

            if (TryGet(imageUrl, out var cachedTexture))
            {
                return cachedTexture;
            }

            Task<Texture2D> loadTask;

            lock (syncRoot)
            {
                if (runtimeCache.TryGetValue(imageUrl, out cachedTexture) && cachedTexture != null)
                {
                    return cachedTexture;
                }

                if (!inflightLoads.TryGetValue(imageUrl, out loadTask))
                {
                    loadTask = LoadInternalAsync(imageUrl, telemetry);
                    inflightLoads[imageUrl] = loadTask;
                }
            }

            try
            {
                var texture = await loadTask.ConfigureAwait(false);
                if (texture != null)
                {
                    lock (syncRoot)
                    {
                        runtimeCache[imageUrl] = texture;
                    }
                }

                return texture;
            }
            finally
            {
                lock (syncRoot)
                {
                    inflightLoads.Remove(imageUrl);
                }
            }
        }

        public bool TryGet(string key, out Texture2D texture)
        {
            texture = null;

            if (!IsInitialized || string.IsNullOrEmpty(key))
            {
                return false;
            }

            lock (syncRoot)
            {
                return runtimeCache.TryGetValue(key, out texture) && texture != null;
            }
        }

        public void Clear()
        {
            lock (syncRoot)
            {
                foreach (var texture in runtimeCache.Values)
                {
                    if (texture != null)
                    {
                        UnityEngine.Object.Destroy(texture);
                    }
                }

                runtimeCache.Clear();
                inflightLoads.Clear();
            }
        }

        private async Task<Texture2D> LoadInternalAsync(string imageUrl, TelemetryLogger telemetry)
        {
            var localPath = GetLocalPath(imageUrl);

            if (File.Exists(localPath))
            {
                try
                {
                    var bytes = await File.ReadAllBytesAsync(localPath).ConfigureAwait(false);
                    var fromDisk = new Texture2D(2, 2, TextureFormat.RGBA32, false);
                    if (fromDisk.LoadImage(bytes))
                    {
                        fromDisk.name = Path.GetFileNameWithoutExtension(localPath);
                        return fromDisk;
                    }

                    UnityEngine.Object.Destroy(fromDisk);
                }
                catch (Exception ex)
                {
                    telemetry?.LogException($"Failed to read cached fish texture from {localPath}.", ex);
                }
            }

            return await DownloadTextureAsync(imageUrl, localPath, telemetry).ConfigureAwait(false);
        }

        private async Task<Texture2D> DownloadTextureAsync(string imageUrl, string localPath, TelemetryLogger telemetry)
        {
            using var request = UnityWebRequestTexture.GetTexture(imageUrl);
            try
            {
                var completedRequest = await SendRequestAsync(request).ConfigureAwait(false);

                if (completedRequest.result != UnityWebRequest.Result.Success)
                {
                    telemetry?.LogWarning($"Fish texture download failed for {imageUrl}: {completedRequest.error}");
                    return null;
                }

                var texture = DownloadHandlerTexture.GetContent(completedRequest);
                if (texture == null)
                {
                    telemetry?.LogWarning($"Fish texture download yielded null content: {imageUrl}");
                    return null;
                }

                try
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(localPath) ?? cacheRoot);
                    var png = texture.EncodeToPNG();
                    if (png != null)
                    {
                        await File.WriteAllBytesAsync(localPath, png).ConfigureAwait(false);
                    }
                }
                catch (Exception ex)
                {
                    telemetry?.LogException($"Failed to persist fish texture to {localPath}.", ex);
                }

                return texture;
            }
            catch (Exception ex)
            {
                telemetry?.LogException($"Fish texture download exception for {imageUrl}.", ex);
                return null;
            }
        }

        private static async Task<UnityWebRequest> SendRequestAsync(UnityWebRequest request)
        {
            var tcs = new TaskCompletionSource<UnityWebRequest>();
            var operation = request.SendWebRequest();
            operation.completed += _ => tcs.TrySetResult(request);
            return await tcs.Task.ConfigureAwait(false);
        }

        private string GetLocalPath(string imageUrl)
        {
            var fileName = $"{ComputeHash(imageUrl)}.png";
            return Path.Combine(cacheRoot, fileName);
        }

        private static string ComputeHash(string input)
        {
            using var sha = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(input);
            var hash = sha.ComputeHash(bytes);
            var sb = new StringBuilder(hash.Length * 2);
            for (var i = 0; i < hash.Length; i++)
            {
                sb.Append(hash[i].ToString("x2"));
            }

            return sb.ToString();
        }
    }
}
