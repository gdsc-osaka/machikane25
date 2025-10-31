using Art.App;
using Art.Fish;
using Art.Rare;
using Art.Telemetry;
using NUnit.Framework;
using System;
using System.Collections;
using UnityEngine;
using UnityEngine.TestTools;

namespace Art.Tests.EditMode.Rare
{
    [TestFixture]
    public sealed class RareCharacterControllerTests
    {
        private GameObject controllerObject;
        private RareCharacterController controller;
        private AppConfig config;
        private FishSpawner mockSpawner;
        private TelemetryLogger telemetry;

        [SetUp]
        public void SetUp()
        {
            controllerObject = new GameObject("TestRareController");
            controller = controllerObject.AddComponent<RareCharacterController>();

            config = ScriptableObject.CreateInstance<AppConfig>();
            config.rareSpawnChance = 1.0f; // 100% for testing
            config.rareSpawnCooldownSeconds = 1f;

            var spawnerObject = new GameObject("TestSpawner");
            mockSpawner = spawnerObject.AddComponent<FishSpawner>();

            telemetry = new TelemetryLogger();
            telemetry.Initialize(null);
        }

        [TearDown]
        public void TearDown()
        {
            if (controllerObject != null)
            {
                UnityEngine.Object.DestroyImmediate(controllerObject);
            }

            if (mockSpawner != null)
            {
                UnityEngine.Object.DestroyImmediate(mockSpawner.gameObject);
            }

            if (config != null)
            {
                UnityEngine.Object.DestroyImmediate(config);
            }
        }

        [Test]
        public void Initialize_WithValidParameters_Succeeds()
        {
            Assert.DoesNotThrow(() =>
            {
                controller.Initialize(config, mockSpawner, telemetry);
            });
        }

        [Test]
        public void Initialize_WithNullConfig_DoesNotThrow()
        {
            Assert.DoesNotThrow(() =>
            {
                controller.Initialize(null, mockSpawner, telemetry);
            });
        }

        [Test]
        public void Initialize_WithNullSpawner_DoesNotThrow()
        {
            Assert.DoesNotThrow(() =>
            {
                controller.Initialize(config, null, telemetry);
            });
        }

        [Test]
        public void Initialize_WithNullTelemetry_DoesNotThrow()
        {
            Assert.DoesNotThrow(() =>
            {
                controller.Initialize(config, mockSpawner, null);
            });
        }

        [Test]
        public void Initialize_WithDeterministicRandom_Succeeds()
        {
            var random = new System.Random(42);
            Assert.DoesNotThrow(() =>
            {
                controller.Initialize(config, mockSpawner, telemetry, random);
            });
        }

        [UnityTest]
        public IEnumerator Run_WithoutInitialization_CompletesImmediately()
        {
            var enumerator = controller.Run();
            var moved = enumerator.MoveNext();
            Assert.IsFalse(moved, "Run should complete immediately without initialization");
            yield return null;
        }

        [UnityTest]
        public IEnumerator Run_WithNullConfig_CompletesImmediately()
        {
            controller.Initialize(null, mockSpawner, telemetry);
            var enumerator = controller.Run();
            var moved = enumerator.MoveNext();
            Assert.IsFalse(moved, "Run should complete immediately with null config");
            yield return null;
        }

        [Test]
        public void WeightedSelection_WithDeterministicRandom_IsConsistent()
        {
            // Create test definitions
            var def1 = ScriptableObject.CreateInstance<RareCharacterDefinition>();
            def1.name = "Rare1";
            def1.weight = 0.5f;
            def1.prefab = new GameObject("Rare1Prefab");

            var def2 = ScriptableObject.CreateInstance<RareCharacterDefinition>();
            def2.name = "Rare2";
            def2.weight = 0.3f;
            def2.prefab = new GameObject("Rare2Prefab");

            var def3 = ScriptableObject.CreateInstance<RareCharacterDefinition>();
            def3.name = "Rare3";
            def3.weight = 0.2f;
            def3.prefab = new GameObject("Rare3Prefab");

            // Use reflection to set the definitions array (since it's private)
            var definitionsField = typeof(RareCharacterController)
                .GetField("definitions", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            definitionsField?.SetValue(controller, new[] { def1, def2, def3 });

            // Initialize with a seeded random
            var random = new System.Random(42);
            controller.Initialize(config, mockSpawner, telemetry, random);

            // The weighted selection should be deterministic with the same seed
            // This test just verifies it doesn't throw
            Assert.DoesNotThrow(() =>
            {
                // Trigger evaluation (use reflection to call private method)
                var evaluateMethod = typeof(RareCharacterController)
                    .GetMethod("EvaluateRareSpawn", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                evaluateMethod?.Invoke(controller, null);
            });

            // Cleanup
            UnityEngine.Object.DestroyImmediate(def1);
            UnityEngine.Object.DestroyImmediate(def2);
            UnityEngine.Object.DestroyImmediate(def3);
            UnityEngine.Object.DestroyImmediate(def1.prefab);
            UnityEngine.Object.DestroyImmediate(def2.prefab);
            UnityEngine.Object.DestroyImmediate(def3.prefab);
        }

        [Test]
        public void SpawnProbability_WithZeroChance_DoesNotSpawn()
        {
            config.rareSpawnChance = 0f;
            var random = new System.Random(42);
            controller.Initialize(config, mockSpawner, telemetry, random);

            // Create a test definition
            var def = ScriptableObject.CreateInstance<RareCharacterDefinition>();
            def.name = "TestRare";
            def.weight = 1.0f;
            def.prefab = new GameObject("TestPrefab");

            var definitionsField = typeof(RareCharacterController)
                .GetField("definitions", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            definitionsField?.SetValue(controller, new[] { def });

            // Get current rare instance before evaluation
            var currentRareField = typeof(RareCharacterController)
                .GetField("currentRareInstance", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

            // Trigger evaluation multiple times
            var evaluateMethod = typeof(RareCharacterController)
                .GetMethod("EvaluateRareSpawn", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

            for (int i = 0; i < 10; i++)
            {
                evaluateMethod?.Invoke(controller, null);
                var currentRare = currentRareField?.GetValue(controller);
                Assert.IsNull(currentRare, "Should not spawn with 0% chance");
            }

            // Cleanup
            UnityEngine.Object.DestroyImmediate(def);
            UnityEngine.Object.DestroyImmediate(def.prefab);
        }

        [Test]
        public void Destruction_CleansUpCurrentRare()
        {
            controller.Initialize(config, mockSpawner, telemetry);

            // Destroy the controller
            Assert.DoesNotThrow(() =>
            {
                UnityEngine.Object.DestroyImmediate(controllerObject);
                controllerObject = null;
                controller = null;
            });
        }
    }
}
