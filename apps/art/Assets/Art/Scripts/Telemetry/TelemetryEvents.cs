namespace Art.Telemetry
{
    /// <summary>
    /// Standard telemetry event names used throughout the application.
    /// </summary>
    public static class TelemetryEvents
    {
        // Fish polling events
        public const string FishPollSuccess = "fish_poll_success";
        public const string FishPollFailure = "fish_poll_failure";
        public const string FishPollRetry = "fish_poll_retry";

        // Fish spawning events
        public const string FishSpawn = "fish_spawn";
        public const string FishUpdate = "fish_update";
        public const string FishDespawn = "fish_despawn";
        public const string FishTextureLoaded = "fish_texture_loaded";
        public const string FishTextureLoadFailed = "fish_texture_load_failed";

        // Visitor detection events
        public const string VisitorDetectorUpdate = "visitor_detector_update";
        public const string VisitorDetectorStarted = "visitor_detector_started";
        public const string VisitorDetectorStopped = "visitor_detector_stopped";
        public const string VisitorDetectorError = "visitor_detector_error";

        // Rare character events
        public const string RareSpawned = "rare_spawned";
        public const string RareEvaluated = "rare_evaluated";

        // Application lifecycle
        public const string AppStarted = "app_started";
        public const string AppStopped = "app_stopped";
    }
}
