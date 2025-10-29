using Art.App;
using Art.Telemetry;
using NUnit.Framework;
using System.Collections;
using UnityEngine;

namespace Art.Fish.Tests
{
    [TestFixture]
    public sealed class FishPollingControllerProviderTests
    {
        private GameObject host;
        private FishPollingController controller;
        private FishRepository repository;
        private AppConfig config;
        private TelemetryLogger telemetry;
        private CapturingProvider provider;

        [SetUp]
        public void SetUp()
        {
            host = new GameObject("FishPollingControllerProviderTests");
            controller = host.AddComponent<FishPollingController>();
            repository = new FishRepository();
            repository.Initialize(120f);
            telemetry = new TelemetryLogger();
            telemetry.Initialize(string.Empty);
            config = ScriptableObject.CreateInstance<AppConfig>();
            config.pollIntervalSeconds = 5f;
            config.minPollIntervalSeconds = 2f;
            config.maxPollIntervalSeconds = 10f;
            provider = new CapturingProvider();
            controller.Initialize(config, repository, telemetry, provider);
        }

        [TearDown]
        public void TearDown()
        {
            Object.DestroyImmediate(config);
            Object.DestroyImmediate(host);
        }

        [Test]
        public void Fetch_PassesConfigAndTelemetryToProvider()
        {
            ExecuteSingleFetch(controller);

            Assert.That(provider.LastContext, Is.Not.Null);
            Assert.That(provider.LastContext.Config, Is.SameAs(config));
            Assert.That(provider.LastContext.Telemetry, Is.SameAs(telemetry));
        }

        [Test]
        public void ProviderException_IsHandledAndCountsAsFailure()
        {
            provider.ShouldThrow = true;

            ExecuteSingleFetch(controller);

            var field = typeof(FishPollingController).GetField("consecutiveFailures", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            Assert.That(field != null, Is.True);
            var failureCount = (int)field.GetValue(controller);
            Assert.That(failureCount, Is.EqualTo(1));
        }

        private static void ExecuteSingleFetch(FishPollingController target)
        {
            var run = target.Run();
            Assert.That(run.MoveNext(), Is.True);
            Drain(run.Current as IEnumerator);
            run.MoveNext();
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

        private sealed class CapturingProvider : IFishDataProvider
        {
            public bool ShouldThrow;
            public FishDataProviderContext LastContext { get; private set; }

            public string SourceTag => "capturing";

            public IEnumerator Fetch(FishDataProviderContext context)
            {
                LastContext = context;
                if (ShouldThrow)
                {
                    throw new System.Exception("boom");
                }

                context.ReportFailure?.Invoke(new FishDataProviderFailure("captured", 0f));
                yield break;
            }
        }
    }
}
