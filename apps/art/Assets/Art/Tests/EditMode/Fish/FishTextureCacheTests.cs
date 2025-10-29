using NUnit.Framework;
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;

namespace Art.Fish.Tests
{
    [TestFixture]
    public sealed class FishTextureCacheTests
    {
        private string cacheRoot;
        private FishTextureCache cache;

        [SetUp]
        public void SetUp()
        {
            cacheRoot = Path.Combine(Path.GetTempPath(), $"FishTextureCacheTests_{Guid.NewGuid():N}");
            Directory.CreateDirectory(cacheRoot);

            cache = new FishTextureCache();
            cache.Initialize(cacheRoot);
        }

        [TearDown]
        public void TearDown()
        {
            cache.Clear();
            if (Directory.Exists(cacheRoot))
            {
                Directory.Delete(cacheRoot, true);
            }
        }

        [Test]
        public async Task LoadAsync_ReadsTextureFromDiskWhenAvailable()
        {
            var url = "https://example.com/fish.png";
            var diskPath = GetCachePath(url);

            var sourceTexture = CreateTexture(Color.magenta);
            var png = sourceTexture.EncodeToPNG();
            await File.WriteAllBytesAsync(diskPath, png);
            UnityEngine.Object.DestroyImmediate(sourceTexture);

            var loadedTexture = await cache.LoadAsync(url, null);

            Assert.That(loadedTexture, Is.Not.Null);
            Assert.That(loadedTexture.width, Is.EqualTo(2));
            Assert.That(cache.TryGet(url, out var cached), Is.True);
            Assert.That(cached, Is.SameAs(loadedTexture));
        }

        [Test]
        public async Task LoadAsync_DownloadsTextureAndCachesToDisk()
        {
            var sourcePath = Path.Combine(cacheRoot, "source.png");

            var sourceTexture = CreateTexture(Color.green);
            var png = sourceTexture.EncodeToPNG();
            await File.WriteAllBytesAsync(sourcePath, png);
            UnityEngine.Object.DestroyImmediate(sourceTexture);

            var url = new Uri(sourcePath).AbsoluteUri;
            var loadedTexture = await cache.LoadAsync(url, null);

            Assert.That(loadedTexture, Is.Not.Null);
            Assert.That(File.Exists(GetCachePath(url)), Is.True);
        }

        [Test]
        public async Task LoadAsync_ReturnsSameInstanceFromRuntimeCache()
        {
            var url = "https://example.com/reuse.png";
            var diskPath = GetCachePath(url);

            var sourceTexture = CreateTexture(Color.cyan);
            var png = sourceTexture.EncodeToPNG();
            await File.WriteAllBytesAsync(diskPath, png);
            UnityEngine.Object.DestroyImmediate(sourceTexture);

            var first = await cache.LoadAsync(url, null);
            var second = await cache.LoadAsync(url, null);

            Assert.That(first, Is.SameAs(second));
        }

        private string GetCachePath(string url)
        {
            using var sha = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(url);
            var hash = sha.ComputeHash(bytes);
            var sb = new StringBuilder(hash.Length * 2);
            for (var i = 0; i < hash.Length; i++)
            {
                sb.Append(hash[i].ToString("x2"));
            }

            return Path.Combine(cacheRoot, $"{sb}.png");
        }

        private static Texture2D CreateTexture(Color colour)
        {
            var texture = new Texture2D(2, 2, TextureFormat.RGBA32, false);
            for (var x = 0; x < 2; x++)
            {
                for (var y = 0; y < 2; y++)
                {
                    texture.SetPixel(x, y, colour);
                }
            }
            texture.Apply();
            return texture;
        }
    }
}
