using NUnit.Framework;
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Art.Fish.Tests
{
    [TestFixture]
    public sealed class FishRepositoryTests
    {
        private FishRepository repository;
        private float time;
        private List<FishState> addedEvents;
        private List<FishState> updatedEvents;
        private List<string> removedEvents;

        [SetUp]
        public void SetUp()
        {
            time = 0f;
            repository = new FishRepository();
            repository.SetTimeProvider(() => time);

            addedEvents = new List<FishState>();
            updatedEvents = new List<FishState>();
            removedEvents = new List<string>();

            repository.FishAdded += state => addedEvents.Add(state);
            repository.FishUpdated += state => updatedEvents.Add(state);
            repository.FishRemoved += id => removedEvents.Add(id);
        }

        [Test]
        public void ApplyPayload_AddsNewFishAndRaisesEvents()
        {
            repository.Initialize(30f);
            var fish = new FishState("alpha", "https://fish/alpha.png", Color.red, DateTime.UtcNow);

            var diff = repository.ApplyPayload(new[] { fish });

            Assert.That(diff.Added, Has.Count.EqualTo(1));
            Assert.That(diff.Updated, Is.Empty);
            Assert.That(diff.Removed, Is.Empty);
            Assert.That(repository.Snapshot(), Has.Count.EqualTo(1));
            Assert.That(addedEvents, Has.Count.EqualTo(1));
            Assert.That(updatedEvents, Is.Empty);
            Assert.That(removedEvents, Is.Empty);
        }

        [Test]
        public void ApplyPayload_DetectsUpdatesWhenPropertiesChange()
        {
            repository.Initialize(30f);
            var createdAt = DateTime.UtcNow;
            var initial = new FishState("beta", "https://fish/beta.png", Color.green, createdAt);
            repository.ApplyPayload(new[] { initial });

            time += 1f;
            var updated = new FishState("beta", "https://fish/beta-new.png", Color.blue, createdAt);
            var diff = repository.ApplyPayload(new[] { updated });

            Assert.That(diff.Added, Is.Empty);
            Assert.That(diff.Updated, Has.Count.EqualTo(1));
            Assert.That(diff.Removed, Is.Empty);
            Assert.That(updatedEvents, Has.Count.EqualTo(1));
            Assert.That(repository.Snapshot(), Has.Count.EqualTo(1));
            Assert.That(repository.Snapshot()[0].ImageUrl, Is.EqualTo("https://fish/beta-new.png"));
        }

        [Test]
        public void ApplyPayload_RemovesFishMissingFromPayload()
        {
            repository.Initialize(30f);
            var fish = new FishState("gamma", "https://fish/gamma.png", Color.yellow, DateTime.UtcNow);
            repository.ApplyPayload(new[] { fish });

            time += 1f;
            var diff = repository.ApplyPayload(Array.Empty<FishState>());

            Assert.That(diff.Added, Is.Empty);
            Assert.That(diff.Updated, Is.Empty);
            Assert.That(diff.Removed, Has.Count.EqualTo(1));
            Assert.That(removedEvents, Has.Count.EqualTo(1));
            Assert.That(repository.Snapshot(), Is.Empty);
        }

        [Test]
        public void PurgeExpired_DropsStaleFishAfterTtl()
        {
            repository.Initialize(2f);
            var fish = new FishState("delta", "https://fish/delta.png", Color.cyan, DateTime.UtcNow);
            repository.ApplyPayload(new[] { fish });

            time = 3f;
            repository.PurgeExpired(time);

            Assert.That(removedEvents, Has.Count.EqualTo(1));
            Assert.That(repository.Snapshot(), Is.Empty);
        }
    }
}