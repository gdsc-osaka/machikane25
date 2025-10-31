using NUnit.Framework;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Art.Fish.Tests
{
    [TestFixture]
    public sealed class MockFishDataProviderTests
    {
        private MockFishDataProvider provider;
        private MockFishDataset dataset;
        private List<FishState> receivedStates;
        private FishDataProviderFailure receivedFailure;

        [SetUp]
        public void SetUp()
        {
            provider = ScriptableObject.CreateInstance<MockFishDataProvider>();
            dataset = ScriptableObject.CreateInstance<MockFishDataset>();
            provider.SetDataset(dataset);
            receivedStates = new List<FishState>();
            receivedFailure = null;
        }

        [TearDown]
        public void TearDown()
        {
            Object.DestroyImmediate(provider);
            Object.DestroyImmediate(dataset);
        }

        [Test]
        public void EmitsStatesFromDataset()
        {
            dataset.entries.Add(new MockFishEntry
            {
                id = "alpha",
                imageUrl = "https://example.com/a.png",
                tint = Color.red,
                createdAtIso = "2024-06-01T00:00:00Z"
            });

            var enumerator = provider.Fetch(CreateContext());
            Drain(enumerator);

            Assert.That(receivedStates, Has.Count.EqualTo(1));
            Assert.That(receivedStates[0].Id, Is.EqualTo("alpha"));
            Assert.That(receivedStates[0].ImageUrl, Is.EqualTo("https://example.com/a.png"));
            Assert.That(receivedFailure, Is.Null);
        }

        [Test]
        public void MissingDatasetRaisesFailure()
        {
            provider.SetDataset(null);

            var enumerator = provider.Fetch(CreateContext());
            Drain(enumerator);

            Assert.That(receivedStates, Is.Empty);
            Assert.That(receivedFailure, Is.Not.Null);
            Assert.That(receivedFailure.Reason, Is.EqualTo("mock_dataset_empty"));
        }

        private FishDataProviderContext CreateContext()
        {
            return new FishDataProviderContext(
                null,
                null,
                success =>
                {
                    if (success?.States != null)
                    {
                        receivedStates.AddRange(success.States);
                    }
                },
                failure => receivedFailure = failure);
        }

        private static void Drain(IEnumerator enumerator)
        {
            if (enumerator == null)
            {
                return;
            }

            while (enumerator.MoveNext())
            {
                if (enumerator.Current is IEnumerator nested)
                {
                    Drain(nested);
                }
            }
        }
    }
}
