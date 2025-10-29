using Art.App;
using Art.Telemetry;
using NUnit.Framework;
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using UnityEngine;

namespace Art.Fish.Tests
{
    [TestFixture]
    public sealed class FishPollingControllerTests
    {
        private GameObject host;
        private FishPollingController controller;
        private StubProvider provider;
        private FishRepository repository;
        private AppConfig config;
        private TelemetryLogger telemetry;

        [SetUp]
        public void SetUp()
        {
            host = new GameObject("FishPollingControllerTests");
            controller = host.AddComponent<FishPollingController>();

            repository = new FishRepository();
            repository.Initialize(120f);

            telemetry = new TelemetryLogger();
            telemetry.Initialize(string.Empty);

            config = ScriptableObject.CreateInstance<AppConfig>();
            config.backendUrl = "https://example.com";
            config.apiKey = "test-key";
            config.pollIntervalSeconds = 5f;
            config.minPollIntervalSeconds = 2f;
            config.maxPollIntervalSeconds = 10f;

            provider = new StubProvider();
            controller.Initialize(config, repository, telemetry, provider);
        }

        [TearDown]
        public void TearDown()
        {
            if (config != null)
            {
                UnityEngine.Object.DestroyImmediate(config);
            }

            if (host != null)
            {
                UnityEngine.Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void SuccessfulFetch_PopulatesRepositoryAndResetsBackoff()
        {
            provider.EnqueueSuccess(DeserializeStates("sample-success.json"));

            ExecuteSingleFetch(controller);

            var snapshot = repository.Snapshot();
            Assert.That(snapshot, Has.Count.EqualTo(2));
            Assert.That(snapshot[0].Id, Is.EqualTo("alpha"));
            Assert.That(GetFailureCount(controller), Is.EqualTo(0));
            Assert.That(GetWaitInterval(controller), Is.EqualTo(5f).Within(0.01f));
        }

        [Test]
        public void FailedFetch_IncrementsFailuresAndBacksOff()
        {
            provider.EnqueueFailure("Server error");

            ExecuteSingleFetch(controller);

            Assert.That(repository.Snapshot(), Is.Empty);
            Assert.That(GetFailureCount(controller), Is.EqualTo(1));
            Assert.That(GetWaitInterval(controller), Is.EqualTo(7.5f).Within(0.01f));
        }

        [Test]
        public void MultipleFailures_ClampToMaxInterval()
        {
            provider.EnqueueFailure("Server error");
            provider.EnqueueFailure("Server error");

            ExecuteSingleFetch(controller);
            ExecuteSingleFetch(controller);

            Assert.That(GetFailureCount(controller), Is.EqualTo(2));
            Assert.That(GetWaitInterval(controller), Is.EqualTo(10f).Within(0.01f));
        }

        private static void ExecuteSingleFetch(FishPollingController controller)
        {
            var run = controller.Run();
            Assert.That(run.MoveNext(), Is.True);
            var fetch = run.Current as IEnumerator;
            Assert.That(fetch, Is.Not.Null);
            Drain(fetch);

            // Advance past the wait instruction produced by the polling loop.
            run.MoveNext();
        }

        private static void Drain(IEnumerator enumerator)
        {
            while (enumerator.MoveNext())
            {
                if (enumerator.Current is IEnumerator nested)
                {
                    Drain(nested);
                }
            }
        }

        private static string LoadPayload(string filename)
        {
            var path = Path.Combine(Application.dataPath, "Tests/TestData/Fish", filename);
            return File.ReadAllText(path);
        }

        private static IReadOnlyList<FishState> DeserializeStates(string filename)
        {
            var payload = LoadPayload(filename);
            var dtos = JsonUtilityExtensions.FromJsonArray<FishDto>(payload);
            var states = new List<FishState>(dtos.Length);
            for (var i = 0; i < dtos.Length; i++)
            {
                if (FishStateMapper.TryMap(dtos[i], out var state, out _))
                {
                    states.Add(state);
                }
            }

            return states;
        }

        private static int GetFailureCount(FishPollingController controller)
        {
            var field = typeof(FishPollingController).GetField("consecutiveFailures", BindingFlags.NonPublic | BindingFlags.Instance);
            return (int)field.GetValue(controller);
        }

        private static float GetWaitInterval(FishPollingController controller)
        {
            var method = typeof(FishPollingController).GetMethod("GetWaitInterval", BindingFlags.NonPublic | BindingFlags.Instance);
            return (float)method.Invoke(controller, null);
        }

        private sealed class StubProvider : IFishDataProvider
        {
            private readonly Queue<Result> results = new Queue<Result>();

            public string SourceTag => "stub";

            public void EnqueueSuccess(IReadOnlyList<FishState> states, float durationMs = 10f)
            {
                results.Enqueue(Result.Success(states, durationMs));
            }

            public void EnqueueFailure(string reason, float durationMs = 10f)
            {
                results.Enqueue(Result.Failure(reason, durationMs));
            }

            public IEnumerator Fetch(FishDataProviderContext context)
            {
                yield return null;
                if (results.Count == 0)
                {
                    context.ReportFailure?.Invoke(new FishDataProviderFailure("stub_empty", 0f));
                    yield break;
                }

                var result = results.Dequeue();
                if (result.IsSuccess)
                {
                    context.ReportSuccess?.Invoke(new FishDataProviderSuccess(result.States, result.DurationMs));
                }
                else
                {
                    context.ReportFailure?.Invoke(new FishDataProviderFailure(result.Reason, result.DurationMs));
                }
            }

            private readonly struct Result
            {
                private Result(IReadOnlyList<FishState> states, string reason, float durationMs, bool isSuccess)
                {
                    States = states;
                    Reason = reason;
                    DurationMs = durationMs;
                    IsSuccess = isSuccess;
                }

                public IReadOnlyList<FishState> States { get; }
                public string Reason { get; }
                public float DurationMs { get; }
                public bool IsSuccess { get; }

                public static Result Success(IReadOnlyList<FishState> states, float durationMs)
                {
                    return new Result(states, null, durationMs, true);
                }

                public static Result Failure(string reason, float durationMs)
                {
                    return new Result(null, reason, durationMs, false);
                }
            }
        }
    }
}
