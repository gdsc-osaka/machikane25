using System;
using System.Collections;
using System.Reflection;
using Art.Fish;
using Art.Presentation.Schools;
using Art.Visitors;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace Art.Tests.PlayMode.Visitors
{
    public sealed class VisitorInfluenceTests
    {
        private GameObject coordinatorObject;
        private SchoolCoordinator coordinator;
        private VisitorInfluenceSettings settings;

        [SetUp]
        public void SetUp()
        {
            coordinatorObject = new GameObject("SchoolCoordinator_Tests");
            coordinator = coordinatorObject.AddComponent<SchoolCoordinator>();
            settings = ScriptableObject.CreateInstance<VisitorInfluenceSettings>();
            ConfigureSettings(settings);
            coordinator.SetVisitorInfluence(settings);
        }

        [TearDown]
        public void TearDown()
        {
            if (settings != null)
            {
                Object.DestroyImmediate(settings);
            }

            if (coordinatorObject != null)
            {
                Object.DestroyImmediate(coordinatorObject);
            }
        }

        [UnityTest]
        public IEnumerator ApplyVisitorInfluence_SteersAgentTowardVisitor()
        {
            var agentObject = new GameObject("FishAgent_A");
            var agent = agentObject.AddComponent<FishAgent>();
            agentObject.transform.position = new Vector3(-2f, 0f, 0f);
            coordinator.RegisterAgent(agent);

            coordinator.ApplyVisitorInfluence(new[]
            {
                new VisitorGroup(new Vector2(0.9f, 0.5f), 1f)
            });

            yield return null;

            var steering = agent.GetVisitorSteering();
            Assert.That(steering.magnitude, Is.GreaterThan(0f));
            Assert.That(steering.x, Is.GreaterThan(0f));

            Object.DestroyImmediate(agentObject);
        }

        [UnityTest]
        public IEnumerator ApplyVisitorInfluence_DecaysWhenVisitorsLeave()
        {
            var agentObject = new GameObject("FishAgent_B");
            var agent = agentObject.AddComponent<FishAgent>();
            coordinator.RegisterAgent(agent);

            coordinator.ApplyVisitorInfluence(new[]
            {
                new VisitorGroup(new Vector2(0.75f, 0.5f), 1f)
            });

            yield return null;
            var initialMagnitude = agent.GetVisitorSteering().magnitude;
            Assert.That(initialMagnitude, Is.GreaterThan(0f));

            coordinator.ApplyVisitorInfluence(Array.Empty<VisitorGroup>());
            yield return null;
            var decayed = agent.GetVisitorSteering().magnitude;

            Assert.That(decayed, Is.LessThan(initialMagnitude));
            Object.DestroyImmediate(agentObject);
        }

        private static void ConfigureSettings(VisitorInfluenceSettings asset)
        {
            SetField(asset, "planeExtents", new Vector2(10f, 6f));
            SetField(asset, "planePivot", new Vector2(0.5f, 0.5f));
            SetField(asset, "planeHeight", 0f);
            SetField(asset, "attractionStrength", 5f);
            SetField(asset, "maxDistance", 12f);
            SetField(asset, "falloffPower", 1.2f);
            SetField(asset, "steeringResponsiveness", 8f);
            SetField(asset, "absenceDamping", 6f);
            SetField(asset, "minimumMagnitude", 0.01f);
        }

        private static void SetField<TValue>(VisitorInfluenceSettings asset, string fieldName, TValue value)
        {
            var field = typeof(VisitorInfluenceSettings).GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.That(field, Is.Not.Null, $"Field {fieldName} missing on VisitorInfluenceSettings");
            field.SetValue(asset, value);
        }
    }
}
