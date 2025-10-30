using Art.Telemetry;
using NUnit.Framework;
using System;
using System.Collections.Generic;

namespace Art.Tests.EditMode.Telemetry
{
    [TestFixture]
    public sealed class TelemetryLoggerTests
    {
        [Test]
        public void Initialize_WithNullDsn_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            Assert.DoesNotThrow(() => logger.Initialize(null));
        }

        [Test]
        public void Initialize_WithEmptyDsn_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            Assert.DoesNotThrow(() => logger.Initialize(string.Empty));
        }

        [Test]
        public void Initialize_WithValidDsn_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            Assert.DoesNotThrow(() => logger.Initialize("https://example@sentry.io/123456"));
        }

        [Test]
        public void LogInfo_BeforeInitialize_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            Assert.DoesNotThrow(() => logger.LogInfo("test message"));
        }

        [Test]
        public void LogInfo_AfterInitialize_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.LogInfo("test message"));
        }

        [Test]
        public void LogWarning_AfterInitialize_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.LogWarning("test warning"));
        }

        [Test]
        public void LogEvent_WithNullEventName_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.LogEvent(null));
        }

        [Test]
        public void LogEvent_WithEmptyEventName_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.LogEvent(string.Empty));
        }

        [Test]
        public void LogEvent_WithValidEventName_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.LogEvent(TelemetryEvents.FishPollSuccess));
        }

        [Test]
        public void LogEvent_WithPayload_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.LogEvent(TelemetryEvents.FishPollSuccess, new { count = 5 }));
        }

        [Test]
        public void LogEvent_WithDictionaryPayload_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            var payload = new Dictionary<string, string>
            {
                { "key1", "value1" },
                { "key2", "value2" }
            };
            Assert.DoesNotThrow(() => logger.LogEvent(TelemetryEvents.FishPollSuccess, payload));
        }

        [Test]
        public void LogException_WithNullException_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.LogException("context", null));
        }

        [Test]
        public void LogException_WithValidException_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            var exception = new InvalidOperationException("test exception");
            Assert.DoesNotThrow(() => logger.LogException("test context", exception));
        }

        [Test]
        public void LogBreadcrumb_WithNullCategory_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.LogBreadcrumb(null, "message"));
        }

        [Test]
        public void LogBreadcrumb_WithValidCategory_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.LogBreadcrumb("http", "request completed"));
        }

        [Test]
        public void LogBreadcrumb_WithData_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.LogBreadcrumb("http", "request completed", new { url = "test" }));
        }

        [Test]
        public void Flush_BeforeInitialize_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            Assert.DoesNotThrow(() => logger.Flush());
        }

        [Test]
        public void Flush_AfterInitialize_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);
            Assert.DoesNotThrow(() => logger.Flush());
        }

        [Test]
        public void AllMethods_WorkWithoutSentry_DoesNotThrow()
        {
            var logger = new TelemetryLogger();
            logger.Initialize(null);

            Assert.DoesNotThrow(() =>
            {
                logger.LogInfo("info");
                logger.LogWarning("warning");
                logger.LogEvent("event", new { data = "test" });
                logger.LogException("context", new Exception("test"));
                logger.LogBreadcrumb("category", "message", new { key = "value" });
                logger.Flush();
            });
        }
    }
}
