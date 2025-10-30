using NUnit.Framework;
using System;
using System.Collections;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;
using UnityEngine.TestTools;
using Art.Presentation.Schools;
using Art.Telemetry;

namespace Art.Fish.Tests.PlayMode
{
    public sealed class FishSpawnerPlayTests
    {
        private FishRepository repository;
        private FishTextureCache cache;
        private TelemetryLogger telemetry;
        private FishSpawner spawner;
        private FishDefinition definition;
        private FishAgent prefabAgent;
        private Texture2D placeholderTexture;
        private GameObject spawnerObject;
        private GameObject parentObject;
        private SchoolCoordinator coordinator;
        private string cacheRoot;

        [SetUp]
        public void SetUp()
        {
            repository = new FishRepository();
            repository.Initialize(30f);

            cacheRoot = Path.Combine(Path.GetTempPath(), $"FishSpawnerPlayTests_{Guid.NewGuid():N}");
            Directory.CreateDirectory(cacheRoot);

            cache = new FishTextureCache();
            cache.Initialize(cacheRoot);

            telemetry = new TelemetryLogger();
            telemetry.Initialize(null);

            spawnerObject = new GameObject("FishSpawner");
            spawner = spawnerObject.AddComponent<FishSpawner>();

            parentObject = new GameObject("FishParent");
            coordinator = new GameObject("SchoolCoordinator").AddComponent<SchoolCoordinator>();

            definition = ScriptableObject.CreateInstance<FishDefinition>();
            prefabAgent = CreateAgentPrefab();

            SetPrivateField(spawner, "schoolCoordinator", coordinator);
            SetPrivateField(spawner, "fishParent", parentObject.transform);
            SetPrivateField(spawner, "defaultDefinition", definition);
            SetDefinitionField("prefab", prefabAgent);

            spawner.Initialize(repository, cache, telemetry);
        }

        [TearDown]
        public void TearDown()
        {
            cache.Clear();

            if (Directory.Exists(cacheRoot))
            {
                Directory.Delete(cacheRoot, true);
            }

            if (definition != null)
            {
                ScriptableObject.DestroyImmediate(definition);
            }

            if (placeholderTexture != null)
            {
                UnityEngine.Object.DestroyImmediate(placeholderTexture);
            }

            if (prefabAgent != null)
            {
                UnityEngine.Object.DestroyImmediate(prefabAgent.gameObject);
            }

            if (coordinator != null)
            {
                UnityEngine.Object.DestroyImmediate(coordinator.gameObject);
            }

            if (parentObject != null)
            {
                UnityEngine.Object.DestroyImmediate(parentObject);
            }

            if (spawnerObject != null)
            {
                UnityEngine.Object.DestroyImmediate(spawnerObject);
            }
        }

        [UnityTest]
        public IEnumerator SpawnerCreatesAgentOnRepositoryAdd()
        {
            var state = new FishState("alpha", string.Empty, Color.red, DateTime.UtcNow);
            repository.ApplyPayload(new[] { state });
            yield return null;

            Assert.That(parentObject.transform.childCount, Is.EqualTo(1));
            Assert.That(coordinator.ActiveAgents, Has.Count.EqualTo(1));
        }

        [UnityTest]
        public IEnumerator SpawnerRemovesAgentOnRepositoryRemoval()
        {
            var state = new FishState("beta", string.Empty, Color.blue, DateTime.UtcNow);
            repository.ApplyPayload(new[] { state });
            yield return null;

            repository.ApplyPayload(Array.Empty<FishState>());
            yield return null;

            Assert.That(parentObject.transform.childCount, Is.EqualTo(0));
            Assert.That(coordinator.ActiveAgents, Is.Empty);
        }

        [UnityTest]
        public IEnumerator SpawnerLoadsTextureFromLocalUri()
        {
            var sourcePath = Path.Combine(cacheRoot, "source.png");
            var sourceTexture = CreateTexture(Color.green);
            var png = sourceTexture.EncodeToPNG();
            File.WriteAllBytes(sourcePath, png);
            UnityEngine.Object.DestroyImmediate(sourceTexture);

            var url = new Uri(sourcePath).AbsoluteUri;
            var state = new FishState("gamma", url, Color.white, DateTime.UtcNow);
            repository.ApplyPayload(new[] { state });

            yield return null;

            var agent = parentObject.GetComponentInChildren<FishAgent>();
            Assert.That(agent, Is.Not.Null);

            var timeout = Time.time + 5f;
            while (agent.GetAppliedTexture() == null && Time.time < timeout)
            {
                yield return null;
            }

            Assert.That(agent.GetAppliedTexture(), Is.Not.Null);
            Assert.That(File.Exists(GetCachePath(url)), Is.True);
        }

        private FishAgent CreateAgentPrefab()
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = "FishAgentTemplate";
            UnityEngine.Object.DestroyImmediate(go.GetComponent<Collider>());

            var agent = go.AddComponent<FishAgent>();
            var renderer = go.GetComponent<Renderer>();
            SetPrivateField(agent, "bodyRenderer", renderer);

            placeholderTexture = CreateTexture(Color.gray);
            SetDefinitionField("placeholderTexture", placeholderTexture);
            return agent;
        }

        private void SetDefinitionField(string fieldName, object value)
        {
            var field = typeof(FishDefinition).GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);
            field.SetValue(definition, value);
        }

        private void SetPrivateField(object target, string fieldName, object value)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);
            field.SetValue(target, value);
        }

        private static Texture2D CreateTexture(Color colour)
        {
            var texture = new Texture2D(2, 2, TextureFormat.RGBA32, false);
            texture.SetPixel(0, 0, colour);
            texture.SetPixel(1, 0, colour);
            texture.SetPixel(0, 1, colour);
            texture.SetPixel(1, 1, colour);
            texture.Apply();
            return texture;
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
    }
}
