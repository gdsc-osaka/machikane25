using Art.Fish;
using Art.Presentation.Schools;
using Art.Rare;
using Art.Telemetry;
using Art.Visitors;
using System.Collections;
using System.IO;
using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace Art.App
{
    /// <summary>
    /// Entry point MonoBehaviour that wires configuration into controller behaviours and manages their lifetimes.
    /// </summary>
    public sealed class AppRoot : MonoBehaviour
    {
        [SerializeField] private AppConfig config;

        [Header("Controllers")]
        [SerializeField] private FishPollingController fishPolling;
        [SerializeField] private FishSpawner fishSpawner;
        [SerializeField] private VisitorDetector visitorDetector;
        [SerializeField] private RareCharacterController rareCharacters;
        [SerializeField] private MockFishDataProvider mockFishProvider;
        [SerializeField] private SchoolCoordinator schoolCoordinator;

        [Header("Services")]
        // FIXME: SerializeReference currently causes issues with Unity serialization
        // [SerializeReference] 
        private FishRepository fishRepository = new FishRepository();
        // [SerializeReference] 
        private FishTextureCache textureCache = new FishTextureCache();
        // [SerializeReference] 
        private TelemetryLogger telemetry = new TelemetryLogger();

        private Coroutine pollingRoutine;
        private Coroutine rareRoutine;

        private void Awake()
        {
            if (!ValidateConfigurationAndControllers())
            {
                enabled = false;
                return;
            }

            telemetry.Initialize(config.sentryDsn);
            var cacheRoot = Path.Combine(Application.persistentDataPath, "FishTextures");
            textureCache.Initialize(cacheRoot);
            fishRepository.Initialize(config.fishTtlSeconds);

            fishSpawner.Initialize(fishRepository, textureCache, telemetry);
            var provider = SelectProvider();
            fishPolling.Initialize(config, fishRepository, telemetry, provider);
            visitorDetector.Initialize(config, telemetry);
            rareCharacters.Initialize(config, fishSpawner, telemetry);

            if (schoolCoordinator != null && visitorDetector != null)
            {
                visitorDetector.OnVisitorsChanged += schoolCoordinator.ApplyVisitorInfluence;
            }

            pollingRoutine = StartCoroutine(RunWithGuard(fishPolling.Run(), "FishPolling"));
            rareRoutine = StartCoroutine(RunWithGuard(rareCharacters.Run(), "RareCharacters"));
            visitorDetector.StartDetection();
        }

        private void OnDestroy()
        {
            if (pollingRoutine != null)
            {
                StopCoroutine(pollingRoutine);
                pollingRoutine = null;
            }

            if (rareRoutine != null)
            {
                StopCoroutine(rareRoutine);
                rareRoutine = null;
            }

            if (visitorDetector != null)
            {
                if (schoolCoordinator != null)
                {
                    visitorDetector.OnVisitorsChanged -= schoolCoordinator.ApplyVisitorInfluence;
                }

                visitorDetector.StopDetection();
            }

            telemetry.Flush();
        }

        private bool ValidateConfigurationAndControllers()
        {
            if (config == null)
            {
                Debug.LogError("AppRoot missing AppConfig reference.", this);
                return false;
            }

            var valid = true;

            if (config.pollingMode == AppConfig.PollingMode.Backend && string.IsNullOrWhiteSpace(config.backendUrl))
            {
                Debug.LogError("AppConfig backend URL is missing or empty.", config);
                valid = false;
            }

            if (config.pollIntervalSeconds <= 0f)
            {
                Debug.LogWarning("AppConfig poll interval is non-positive; FishPollingController will clamp to min interval.", config);
            }

            valid &= EnsureControllerAssigned(fishPolling, nameof(fishPolling));
            valid &= EnsureControllerAssigned(fishSpawner, nameof(fishSpawner));
            valid &= EnsureControllerAssigned(visitorDetector, nameof(visitorDetector));
            valid &= EnsureControllerAssigned(rareCharacters, nameof(rareCharacters));
            valid &= EnsureControllerAssigned(schoolCoordinator, nameof(schoolCoordinator));

            return valid;
        }

        private bool EnsureControllerAssigned(Object controller, string fieldName)
        {
            if (controller != null)
            {
                return true;
            }

            Debug.LogError($"AppRoot missing reference for {fieldName}.", this);
            return false;
        }

        private IEnumerator RunWithGuard(IEnumerator routine, string routineName)
        {
            while (routine != null)
            {
                object current;
                try
                {
                    if (!routine.MoveNext())
                    {
                        yield break;
                    }

                    current = routine.Current;
                }
                catch (System.Exception ex)
                {
                    telemetry.LogException($"{routineName} coroutine threw an exception.", ex);
                    yield break;
                }

                yield return current;
            }
        }

        private IFishDataProvider SelectProvider()
        {
            if (config.pollingMode == AppConfig.PollingMode.MockOffline)
            {
                if (mockFishProvider != null)
                {
                    telemetry.LogWarning("AppRoot running in MockOffline polling mode.");
                    return mockFishProvider;
                }

                Debug.LogWarning("AppRoot MockOffline mode selected but no MockFishDataProvider assigned. Falling back to backend provider.", this);
            }

            return new HttpFishDataProvider();
        }

#if UNITY_EDITOR
        [ContextMenu("Switch Polling Mode")]
        private void SwitchPollingMode()
        {
            if (config == null)
            {
                return;
            }

            config.pollingMode = config.pollingMode == AppConfig.PollingMode.Backend
                ? AppConfig.PollingMode.MockOffline
                : AppConfig.PollingMode.Backend;
            UnityEditor.EditorUtility.SetDirty(config);
            Debug.Log($"AppRoot switched polling mode to {config.pollingMode}.", this);
        }
#endif
    }
}
