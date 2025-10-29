using Art.App;
using Art.Infrastructure;
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
        private StubHttpClient httpClient;
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

            httpClient = new StubHttpClient();
            controller.SetHttpClient(httpClient);
            controller.Initialize(config, repository, telemetry);
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
            httpClient.Enqueue(HttpResponses.Success(LoadPayload("sample-success.json")));

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
            httpClient.Enqueue(HttpResponses.Failure(500, "Server error"));

            ExecuteSingleFetch(controller);

            Assert.That(repository.Snapshot(), Is.Empty);
            Assert.That(GetFailureCount(controller), Is.EqualTo(1));
            Assert.That(GetWaitInterval(controller), Is.EqualTo(7.5f).Within(0.01f));
        }

        [Test]
        public void MultipleFailures_ClampToMaxInterval()
        {
            httpClient.Enqueue(HttpResponses.Failure(500, "Server error"));
            httpClient.Enqueue(HttpResponses.Failure(500, "Server error"));

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

        private sealed class StubHttpClient : IHttpClient
        {
            private readonly Queue<HttpResponse> responses = new Queue<HttpResponse>();

            public void Enqueue(HttpResponse response)
            {
                responses.Enqueue(response);
            }

            public IEnumerator Get(string url, IReadOnlyDictionary<string, string> headers, Action<HttpResponse> onComplete)
            {
                yield return null;
                var response = responses.Count > 0 ? responses.Dequeue() : null;
                onComplete?.Invoke(response);
            }
        }

        private static class HttpResponses
        {
            public static HttpResponse Success(string body)
            {
                return new HttpResponse
                {
                    StatusCode = 200,
                    Body = body,
                    Headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                };
            }

            public static HttpResponse Failure(int statusCode, string error)
            {
                return new HttpResponse
                {
                    StatusCode = statusCode,
                    Error = error,
                    IsNetworkError = false,
                    Headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                };
            }
        }
    }
}